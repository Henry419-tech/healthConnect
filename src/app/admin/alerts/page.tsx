'use client';

// src/app/admin/alerts/page.tsx
//
// Admin — Health Alerts Panel. HEALTHNAV handoff Section 9.
//
// Not in the tab bar — reached directly by URL (/admin/alerts). The entire
// /admin/* surface is gated by HTTP Basic Auth in middleware.ts against
// ADMIN_PASSWORD (see requiresAdminAuth()). By the time this component
// renders, the browser has already been challenged for credentials on page
// load, so the same credentials are reused automatically by the browser on
// every fetch() below to /api/health-alerts — no manual Authorization
// header needed here.
//
// GET /api/health-alerts is public and only ever returns alerts that are
// `active: true` and not expired — so "the list" below is, intentionally,
// the same "Active alerts list" the spec asks for. Deactivating an alert
// removes it from this view (and the bell panel) immediately; it still
// exists in the DB, just not manageable from here in v1 — reactivation
// is a v2 concern, matching the rest of the region-filtering simplification
// called out in Section 8.

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Calendar,
  ShieldAlert,
  Pencil,
  EyeOff,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Send,
} from 'lucide-react';
import '@/styles/admin-alerts.css';

/* ── Types ────────────────────────────────────────────────────── */

type AlertType = 'public_health' | 'facility' | 'calendar';
type Severity = 'info' | 'warning' | 'critical';

interface HealthAlert {
  id: string;
  title: string;
  body: string;
  type: AlertType;
  severity: Severity;
  region: string | null;
  source: string;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface FormState {
  title: string;
  body: string;
  type: AlertType;
  severity: Severity;
  region: string; // '' = Ghana-wide
  source: string;
  expiresAt: string; // yyyy-mm-dd or ''
  sendEmail: boolean;
  sendPush: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  body: '',
  type: 'public_health',
  severity: 'info',
  region: '',
  source: 'Ghana Health Service',
  expiresAt: '',
  sendEmail: false,
  sendPush: false,
};

// Ghana's 16 regions — matches the naming used in User.region (default "Greater Accra"). Empty selection = Ghana-wide.
const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central',
  'Eastern', 'Volta', 'Oti', 'Bono', 'Bono East', 'Ahafo', 'Northern',
  'Savannah', 'North East', 'Upper East', 'Upper West',
];

const TYPE_OPTIONS: { value: AlertType; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { value: 'public_health', label: 'Public Health', icon: AlertTriangle },
  { value: 'facility', label: 'Facility Update', icon: Building2 },
  { value: 'calendar', label: 'Health Calendar', icon: Calendar },
];

const SEVERITY_OPTIONS: { value: Severity; label: string; pillClass: string }[] = [
  { value: 'info', label: 'Info', pillClass: '' },
  { value: 'warning', label: 'Warning', pillClass: 'aa-pill--warning' },
  { value: 'critical', label: 'Critical', pillClass: 'aa-pill--critical' },
];

const TYPE_ICON: Record<AlertType, React.ComponentType<{ size: number }>> = {
  public_health: AlertTriangle,
  facility: Building2,
  calendar: Calendar,
};

const TYPE_LABEL: Record<AlertType, string> = {
  public_health: 'Public Health',
  facility: 'Facility Update',
  calendar: 'Health Calendar',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// yyyy-mm-dd for <input type="date">, in local time (not UTC) so the date
// picker shows the day the admin actually meant.
function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

interface Banner {
  kind: 'success' | 'error';
  message: string;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<HealthAlert[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/health-alerts', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(alert: HealthAlert) {
    setEditingId(alert.id);
    setForm({
      title: alert.title,
      body: alert.body,
      type: alert.type,
      severity: alert.severity,
      region: alert.region ?? '',
      source: alert.source,
      expiresAt: toDateInputValue(alert.expiresAt),
      sendEmail: false,
      sendPush: false,
    });
    setBanner(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setBanner({ kind: 'error', message: 'Title and body are required.' });
      return;
    }

    setSubmitting(true);
    setBanner(null);

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      type: form.type,
      severity: form.severity,
      region: form.region || null,
      source: form.source.trim() || 'Ghana Health Service',
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
      sendEmail: form.sendEmail,
      sendPush: form.sendPush,
    };

    try {
      const res = await fetch(
        editingId ? `/api/health-alerts/${editingId}` : '/api/health-alerts',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      if (editingId) {
        setBanner({ kind: 'success', message: 'Alert updated.' });
      } else if (data.email || data.push) {
        const parts: string[] = [];
        let hasFailure = false;

        if (data.email) {
          parts.push(`emailed ${data.email.sent} user${data.email.sent === 1 ? '' : 's'}${
            data.email.failed > 0 ? ` (${data.email.failed} failed)` : ''
          }`);
          if (data.email.failed > 0) hasFailure = true;
        }
        if (data.push) {
          parts.push(`pushed to ${data.push.sent} device${data.push.sent === 1 ? '' : 's'}${
            data.push.failed > 0 ? ` (${data.push.failed} failed)` : ''
          }`);
          if (data.push.failed > 0) hasFailure = true;
        }

        setBanner({
          kind: hasFailure ? 'error' : 'success',
          message: `Alert published — ${parts.join(', ')}.`,
        });
      } else {
        setBanner({ kind: 'success', message: 'Alert published — no email or push sent (unchecked).' });
      }

      resetForm();
      await loadAlerts();
    } catch (err: any) {
      setBanner({ kind: 'error', message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(alert: HealthAlert) {
    setRowBusyId(alert.id);
    try {
      const res = await fetch(`/api/health-alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error('Failed to deactivate');
      setBanner({ kind: 'success', message: `"${alert.title}" deactivated — no longer visible to users.` });
      if (editingId === alert.id) resetForm();
      await loadAlerts();
    } catch {
      setBanner({ kind: 'error', message: 'Could not deactivate that alert. Please try again.' });
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDelete(alert: HealthAlert) {
    if (!window.confirm(`Delete "${alert.title}" permanently? This can't be undone.`)) return;
    setRowBusyId(alert.id);
    try {
      const res = await fetch(`/api/health-alerts/${alert.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setBanner({ kind: 'success', message: `"${alert.title}" deleted.` });
      if (editingId === alert.id) resetForm();
      await loadAlerts();
    } catch {
      setBanner({ kind: 'error', message: 'Could not delete that alert. Please try again.' });
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="aa-page">
      <div className="aa-container">
        <div className="aa-header">
          <p className="aa-header__eyebrow">
            <ShieldAlert size={13} /> Admin · <Link href="/admin/facilities">Facilities</Link> · <Link href="/admin/providers">Providers</Link>
          </p>
          <h1 className="aa-header__title">Health Alerts</h1>
          <p className="aa-header__subtitle">
            Curate public health bulletins, facility updates, and calendar notices. Publishing
            with email checked sends immediately to every opted-in user — verify details before
            you send.
          </p>
        </div>

        {banner && (
          <div className={`aa-banner aa-banner--${banner.kind}`}>
            {banner.kind === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{banner.message}</span>
            <button className="aa-banner__close" onClick={() => setBanner(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Create / edit form ─────────────────────────────────── */}
        <form className="aa-card" onSubmit={handleSubmit}>
          <h2 className={`aa-card__title ${editingId ? 'aa-card__title--editing' : ''}`}>
            {editingId ? <><Pencil size={15} /> Editing alert</> : 'Create new alert'}
          </h2>

          <div className="aa-field">
            <label className="aa-field__label" htmlFor="aa-title">Title</label>
            <input
              id="aa-title"
              className="aa-input"
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="Cholera Alert — Accra"
              maxLength={120}
              required
            />
          </div>

          <div className="aa-field">
            <label className="aa-field__label" htmlFor="aa-body">Body</label>
            <textarea
              id="aa-body"
              className="aa-textarea"
              value={form.body}
              onChange={e => updateField('body', e.target.value)}
              placeholder="Boil water before drinking. Cases reported in Ashaiman and Tema…"
              maxLength={600}
              required
            />
          </div>

          <div className="aa-field">
            <label className="aa-field__label">Type</label>
            <div className="aa-pill-group">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`aa-pill ${form.type === opt.value ? 'aa-pill--active' : ''}`}
                    onClick={() => updateField('type', opt.value)}
                  >
                    <Icon size={13} /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="aa-field">
            <label className="aa-field__label">Severity</label>
            <div className="aa-pill-group">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`aa-pill ${opt.pillClass} ${form.severity === opt.value ? 'aa-pill--active' : ''}`}
                  onClick={() => updateField('severity', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="aa-field-row">
            <div className="aa-field">
              <label className="aa-field__label" htmlFor="aa-region">Region</label>
              <select
                id="aa-region"
                className="aa-select"
                value={form.region}
                onChange={e => updateField('region', e.target.value)}
              >
                <option value="">Ghana-wide</option>
                {GHANA_REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="aa-field">
              <label className="aa-field__label" htmlFor="aa-expires">Expires (optional)</label>
              <input
                id="aa-expires"
                className="aa-input"
                type="date"
                value={form.expiresAt}
                onChange={e => updateField('expiresAt', e.target.value)}
              />
            </div>
          </div>

          <div className="aa-field">
            <label className="aa-field__label" htmlFor="aa-source">Source</label>
            <input
              id="aa-source"
              className="aa-input"
              type="text"
              value={form.source}
              onChange={e => updateField('source', e.target.value)}
              placeholder="Ghana Health Service"
              maxLength={80}
            />
          </div>

          <label className="aa-checkbox-row" htmlFor="aa-send-email">
            <input
              id="aa-send-email"
              type="checkbox"
              checked={form.sendEmail}
              onChange={e => updateField('sendEmail', e.target.checked)}
              disabled={!!editingId}
            />
            Send email notification to users
            {editingId ? ' (editing never re-sends emails)' : ''}
          </label>

          <label className="aa-checkbox-row" htmlFor="aa-send-push">
            <input
              id="aa-send-push"
              type="checkbox"
              checked={form.sendPush}
              onChange={e => updateField('sendPush', e.target.checked)}
              disabled={!!editingId}
            />
            Send push notification to subscribed devices
            {editingId ? ' (editing never re-sends push)' : ''}
          </label>

          <div className="aa-form-actions">
            <button className="aa-btn aa-btn--primary" type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={15} className="aa-spin" /> : <Send size={15} />}
              {editingId ? 'Save changes' : 'Publish alert'}
            </button>
            {editingId && (
              <button className="aa-btn aa-btn--ghost" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {/* ── Active alerts list ─────────────────────────────────── */}
        <div className="aa-list-header">
          <h2 className="aa-list-title">Active alerts</h2>
          {alerts && <span className="aa-list-count">{alerts.length}</span>}
        </div>

        {alerts === null && !loadError && (
          <div className="aa-empty">Loading alerts…</div>
        )}

        {loadError && (
          <div className="aa-empty">Couldn't load alerts — check your connection and refresh.</div>
        )}

        {alerts !== null && alerts.length === 0 && (
          <div className="aa-empty">No active alerts. Anything published above will appear here.</div>
        )}

        {alerts?.map(alert => {
          const Icon = TYPE_ICON[alert.type];
          const busy = rowBusyId === alert.id;
          return (
            <div key={alert.id} className="aa-row">
              <div className="aa-row__top">
                <p className="aa-row__title">{alert.title}</p>
                <div className="aa-badges">
                  <span className="aa-badge aa-badge--type"><Icon size={11} /> {TYPE_LABEL[alert.type]}</span>
                  <span className={`aa-badge aa-badge--sev-${alert.severity}`}>{alert.severity}</span>
                </div>
              </div>

              <p className="aa-row__body">{alert.body}</p>

              <div className="aa-row__meta">
                <span>{alert.region ?? 'Ghana-wide'}</span>
                <span>·</span>
                <span>{alert.source}</span>
                <span>·</span>
                <span>Created {formatDate(alert.createdAt)}</span>
                {alert.expiresAt && (
                  <>
                    <span>·</span>
                    <span>Expires {formatDate(alert.expiresAt)}</span>
                  </>
                )}
              </div>

              <div className="aa-row__actions">
                <button className="aa-icon-btn" onClick={() => startEdit(alert)} disabled={busy}>
                  <Pencil size={12} /> Edit
                </button>
                <button className="aa-icon-btn" onClick={() => handleDeactivate(alert)} disabled={busy}>
                  {busy ? <Loader2 size={12} className="aa-spin" /> : <EyeOff size={12} />} Deactivate
                </button>
                <button className="aa-icon-btn aa-icon-btn--danger" onClick={() => handleDelete(alert)} disabled={busy}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}