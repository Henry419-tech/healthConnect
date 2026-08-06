'use client';

// src/app/admin/providers/page.tsx
//
// Admin — Provider Verification Queue.
//
// Not in the tab bar — reached directly by URL (/admin/providers), same
// pattern as /admin/alerts. The entire /admin/* surface is gated by HTTP
// Basic Auth in middleware.ts against ADMIN_PASSWORD (see
// requiresAdminAuth()). By the time this component renders, the browser
// has already been challenged for credentials on page load, so the same
// credentials are reused automatically by the browser on every fetch()
// below to /api/admin/providers — no manual Authorization header needed.
//
// Fills the gap called out in api/providers/register/route.ts: "There is
// no admin UI yet to flip PENDING -> VERIFIED; until one exists, do it
// directly in the database." This is that UI.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Globe2,
  BadgeCheck,
  Building2,
  Stethoscope,
  Star,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  ShieldOff,
  ShieldQuestion,
  Trash2,
  ArrowLeft,
  ImageOff,
} from 'lucide-react';
import Link from 'next/link';
import '@/styles/admin-providers.css';

/* ── Types ────────────────────────────────────────────────────── */

type ProviderStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED';
type TabValue = ProviderStatus | 'ALL';

interface AdminProvider {
  id: string;
  type: 'DOCTOR' | 'CLINIC';
  status: ProviderStatus;
  name: string;
  bio: string | null;
  licenceNumber: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string;
  district: string;
  region: string;
  languages: string[];
  insuranceAccepted: string[];
  photos: string[];
  createdAt: string;
  verifiedAt: string | null;
  specialty: { name: string; slug: string; icon: string | null };
  _count: { reviews: number };
}

interface Banner {
  kind: 'success' | 'error';
  message: string;
}

const TABS: { value: TabValue; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ALL', label: 'All' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminProvidersPage() {
  const [tab, setTab] = useState<TabValue>('PENDING');
  const [query, setQuery] = useState('');
  const [providers, setProviders] = useState<AdminProvider[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({ PENDING: 0, VERIFIED: 0, SUSPENDED: 0 });
  const [loadError, setLoadError] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const load = useCallback(async (activeTab: TabValue) => {
    setProviders(null);
    setLoadError(false);
    try {
      const qs = activeTab === 'ALL' ? '' : `?status=${activeTab}`;
      const res = await fetch(`/api/admin/providers${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setProviders(data.providers ?? []);
      if (data.counts) setCounts(data.counts);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const filtered = useMemo(() => {
    if (!providers) return providers;
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.specialty.name.toLowerCase().includes(q)
    );
  }, [providers, query]);

  async function updateStatus(provider: AdminProvider, status: ProviderStatus, successMsg: string) {
    setRowBusyId(provider.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }
      setBanner({ kind: 'success', message: successMsg });
      await load(tab);
    } catch (err: any) {
      setBanner({ kind: 'error', message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDelete(provider: AdminProvider) {
    if (!window.confirm(`Delete "${provider.name}" permanently? This removes their reviews too and can't be undone.`)) return;
    setRowBusyId(provider.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setBanner({ kind: 'success', message: `"${provider.name}" deleted.` });
      await load(tab);
    } catch {
      setBanner({ kind: 'error', message: 'Could not delete that listing. Please try again.' });
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="ap-page">
      <div className="ap-container">
        <div className="ap-header">
          <p className="ap-header__eyebrow">
            <ShieldCheck size={13} /> Admin · <Link href="/admin/alerts">Alerts</Link> · <Link href="/admin/facilities">Facilities</Link>
          </p>
          <h1 className="ap-header__title">Provider Verification</h1>
          <p className="ap-header__subtitle">
            Review doctor and clinic self-registrations before they appear in Find Care search
            results. Verify to publish, suspend to delist without deleting, or remove spam entries.
          </p>
        </div>

        {banner && (
          <div className={`ap-banner ap-banner--${banner.kind}`}>
            {banner.kind === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{banner.message}</span>
            <button className="ap-banner__close" onClick={() => setBanner(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="ap-tabs">
          {TABS.map(t => (
            <button
              key={t.value}
              type="button"
              className={`ap-tab ${tab === t.value ? 'ap-tab--active' : ''} ${t.value === 'PENDING' ? 'ap-tab--pending' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value !== 'ALL' && <span className="ap-tab__count">{counts[t.value] ?? 0}</span>}
            </button>
          ))}
        </div>

        <div className="ap-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, district, or specialty…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="ap-list-header">
          <h2 className="ap-list-title">
            {tab === 'ALL' ? 'All providers' : `${TABS.find(t => t.value === tab)?.label} providers`}
          </h2>
          {filtered && <span className="ap-list-count">{filtered.length}</span>}
        </div>

        {providers === null && !loadError && (
          <div className="ap-empty">Loading providers…</div>
        )}

        {loadError && (
          <div className="ap-empty">Couldn't load providers — check your connection and refresh.</div>
        )}

        {filtered !== null && filtered && filtered.length === 0 && (
          <div className="ap-empty">
            {tab === 'PENDING' ? 'Nothing waiting for review. New self-registrations will appear here.' : 'No providers match here.'}
          </div>
        )}

        {filtered?.map(provider => {
          const busy = rowBusyId === provider.id;
          const TypeIcon = provider.type === 'CLINIC' ? Building2 : Stethoscope;
          return (
            <div key={provider.id} className="ap-card">
              <div className="ap-card__top">
                {provider.photos[0] ? (
                  <img src={provider.photos[0]} alt="" className="ap-card__thumb" />
                ) : (
                  <div className="ap-card__thumb ap-card__thumb--placeholder">
                    <ImageOff size={18} />
                  </div>
                )}

                <div className="ap-card__heading">
                  <div className="ap-card__name-row">
                    <p className="ap-card__name">{provider.name}</p>
                    <div className="ap-badges">
                      <span className="ap-badge ap-badge--type"><TypeIcon size={11} /> {provider.type === 'CLINIC' ? 'Clinic' : 'Doctor'}</span>
                      <span className={`ap-badge ap-badge--status-${provider.status.toLowerCase()}`}>{provider.status}</span>
                    </div>
                  </div>
                  <p className="ap-card__specialty">{provider.specialty.name}</p>
                </div>
              </div>

              {provider.bio && <p className="ap-card__bio">{provider.bio}</p>}

              <div className="ap-card__details">
                <div className="ap-card__detail">
                  <Phone size={13} /> <span>{provider.phone}</span>
                </div>
                {provider.whatsapp && (
                  <div className="ap-card__detail">
                    <MessageCircle size={13} /> <span>{provider.whatsapp}</span>
                  </div>
                )}
                <div className="ap-card__detail">
                  <MapPin size={13} /> <span>{provider.address}, {provider.district}, {provider.region}</span>
                </div>
                <div className="ap-card__detail">
                  <Globe2 size={13} /> <span>{provider.languages.join(', ')}</span>
                </div>
                {provider.licenceNumber && (
                  <div className="ap-card__detail">
                    <BadgeCheck size={13} /> <span>Licence {provider.licenceNumber}</span>
                  </div>
                )}
                {provider._count.reviews > 0 && (
                  <div className="ap-card__detail">
                    <Star size={13} /> <span>{provider._count.reviews} review{provider._count.reviews === 1 ? '' : 's'}</span>
                  </div>
                )}
              </div>

              <div className="ap-card__meta">
                <span>Submitted {formatDate(provider.createdAt)}</span>
                {provider.verifiedAt && (
                  <>
                    <span>·</span>
                    <span>Verified {formatDate(provider.verifiedAt)}</span>
                  </>
                )}
                <span>·</span>
                <span>{provider.insuranceAccepted.join(', ')}</span>
              </div>

              <div className="ap-card__actions">
                {provider.status !== 'VERIFIED' && (
                  <button
                    className="ap-icon-btn ap-icon-btn--primary"
                    onClick={() => updateStatus(provider, 'VERIFIED', `"${provider.name}" is now live in Find Care.`)}
                    disabled={busy}
                  >
                    {busy ? <Loader2 size={13} className="ap-spin" /> : <ShieldCheck size={13} />}
                    {provider.status === 'PENDING' ? 'Verify & publish' : 'Reinstate'}
                  </button>
                )}
                {provider.status === 'VERIFIED' && (
                  <button
                    className="ap-icon-btn ap-icon-btn--warn"
                    onClick={() => updateStatus(provider, 'SUSPENDED', `"${provider.name}" suspended — no longer visible to patients.`)}
                    disabled={busy}
                  >
                    {busy ? <Loader2 size={13} className="ap-spin" /> : <ShieldOff size={13} />}
                    Suspend
                  </button>
                )}
                {provider.status === 'PENDING' && (
                  <button
                    className="ap-icon-btn"
                    onClick={() => updateStatus(provider, 'SUSPENDED', `"${provider.name}" declined and moved to suspended.`)}
                    disabled={busy}
                  >
                    <ShieldQuestion size={13} /> Decline
                  </button>
                )}
                <button
                  className="ap-icon-btn ap-icon-btn--danger"
                  onClick={() => handleDelete(provider)}
                  disabled={busy}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          );
        })}

        <p className="ap-header__eyebrow" style={{ marginTop: 24 }}>
          <Link href="/admin/alerts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={13} /> Back to Health Alerts
          </Link>
        </p>
      </div>
    </div>
  );
}