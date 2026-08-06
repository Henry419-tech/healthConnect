'use client';

// src/app/admin/facilities/page.tsx
//
// Admin — Facility Verification Queue. The Facility counterpart to
// /admin/providers, built to match it closely so both admin surfaces feel
// the same. Same HTTP Basic Auth gate (requiresAdminAuth() in
// middleware.ts against ADMIN_PASSWORD) covers /admin/* already — no
// separate auth wiring needed here.
//
// Two things genuinely differ from the provider version, both because
// Facility isn't shaped like Provider:
//   1. `source` badge (admin / user / datagovgh) — Provider has no
//      equivalent. Useful here because the seed script already dropped
//      3,438 pre-VERIFIED rows into this same table, so at a glance you
//      can tell "real user report awaiting review" from "already-verified
//      seed data" when browsing the Verified/All tabs.
//   2. No specialty relation or review count — Facility.type is a plain
//      taxonomy slug (FACILITY_TYPE_OPTIONS), not a DB relation, and there
//      are no FacilityReview rows. Card layout is simpler as a result.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Globe2,
  Ambulance,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  ShieldOff,
  ShieldQuestion,
  Trash2,
  ArrowLeft,
  UserRound,
  DatabaseZap,
  ShieldPlus,
} from 'lucide-react';
import Link from 'next/link';
import { FACILITY_TYPE_OPTIONS } from '@/lib/constants';
import '@/styles/admin-providers.css';

/* ── Types ────────────────────────────────────────────────────── */

type FacilityStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED';
type TabValue = FacilityStatus | 'ALL';

interface AdminFacility {
  id: string;
  status: FacilityStatus;
  source: string; // 'admin' | 'user' | 'datagovgh'
  name: string;
  type: string;
  typeLabel: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  district: string | null;
  emergencyServices: boolean;
  hours: string | null;
  nhis: string;
  services: string[];
  createdAt: string;
  verifiedAt: string | null;
  submittedById: string | null;
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

const TYPE_LABELS = Object.fromEntries(FACILITY_TYPE_OPTIONS.map(t => [t.slug, t.label]));

const SOURCE_META: Record<string, { label: string; icon: React.ElementType }> = {
  user: { label: 'User submission', icon: UserRound },
  admin: { label: 'Added by admin', icon: ShieldPlus },
  datagovgh: { label: 'Gov. data seed', icon: DatabaseZap },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminFacilitiesPage() {
  const [tab, setTab] = useState<TabValue>('PENDING');
  const [query, setQuery] = useState('');
  const [facilities, setFacilities] = useState<AdminFacility[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({ PENDING: 0, VERIFIED: 0, SUSPENDED: 0 });
  const [loadError, setLoadError] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const load = useCallback(async (activeTab: TabValue) => {
    setFacilities(null);
    setLoadError(false);
    try {
      const qs = activeTab === 'ALL' ? '' : `?status=${activeTab}`;
      const res = await fetch(`/api/admin/facilities${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setFacilities(data.facilities ?? []);
      if (data.counts) setCounts(data.counts);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const filtered = useMemo(() => {
    if (!facilities) return facilities;
    const q = query.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.district ?? '').toLowerCase().includes(q) ||
      (f.city ?? '').toLowerCase().includes(q) ||
      (TYPE_LABELS[f.type] ?? f.type).toLowerCase().includes(q)
    );
  }, [facilities, query]);

  async function updateStatus(facility: AdminFacility, status: FacilityStatus, successMsg: string) {
    setRowBusyId(facility.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/facilities/${facility.id}`, {
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

  async function handleDelete(facility: AdminFacility) {
    if (!window.confirm(`Delete "${facility.name}" permanently? This can't be undone.`)) return;
    setRowBusyId(facility.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/facilities/${facility.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setBanner({ kind: 'success', message: `"${facility.name}" deleted.` });
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
            <ShieldCheck size={13} /> Admin · <Link href="/admin/alerts">Alerts</Link> · <Link href="/admin/providers">Providers</Link>
          </p>
          <h1 className="ap-header__title">Facility Verification</h1>
          <p className="ap-header__subtitle">
            Review community-submitted facilities before they appear in Facilities search
            results. Verify to publish, suspend to delist without deleting, or remove spam entries.
            Rows sourced from the government data seed are already Verified.
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
            placeholder="Search by name, town, district, or type…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="ap-list-header">
          <h2 className="ap-list-title">
            {tab === 'ALL' ? 'All facilities' : `${TABS.find(t => t.value === tab)?.label} facilities`}
          </h2>
          {filtered && <span className="ap-list-count">{filtered.length}</span>}
        </div>

        {facilities === null && !loadError && (
          <div className="ap-empty">Loading facilities…</div>
        )}

        {loadError && (
          <div className="ap-empty">Couldn't load facilities — check your connection and refresh.</div>
        )}

        {filtered !== null && filtered && filtered.length === 0 && (
          <div className="ap-empty">
            {tab === 'PENDING' ? 'Nothing waiting for review. New community submissions will appear here.' : 'No facilities match here.'}
          </div>
        )}

        {filtered?.map(facility => {
          const busy = rowBusyId === facility.id;
          const sourceMeta = SOURCE_META[facility.source] ?? { label: facility.source, icon: ShieldPlus };
          const SourceIcon = sourceMeta.icon;
          const locationLine = [facility.address, facility.city, facility.district, facility.region]
            .filter(Boolean).join(', ');
          return (
            <div key={facility.id} className="ap-card">
              <div className="ap-card__top">
                <div className="ap-card__thumb ap-card__thumb--placeholder">
                  <SourceIcon size={18} />
                </div>

                <div className="ap-card__heading">
                  <div className="ap-card__name-row">
                    <p className="ap-card__name">{facility.name}</p>
                    <div className="ap-badges">
                      <span className="ap-badge ap-badge--type">{facility.typeLabel || TYPE_LABELS[facility.type] || facility.type}</span>
                      <span className={`ap-badge ap-badge--status-${facility.status.toLowerCase()}`}>{facility.status}</span>
                    </div>
                  </div>
                  <p className="ap-card__specialty">{sourceMeta.label}</p>
                </div>
              </div>

              <div className="ap-card__details">
                {facility.phone && (
                  <div className="ap-card__detail">
                    <Phone size={13} /> <span>{facility.phone}</span>
                  </div>
                )}
                {facility.whatsapp && (
                  <div className="ap-card__detail">
                    <MessageCircle size={13} /> <span>{facility.whatsapp}</span>
                  </div>
                )}
                {locationLine && (
                  <div className="ap-card__detail">
                    <MapPin size={13} /> <span>{locationLine}</span>
                  </div>
                )}
                {facility.website && (
                  <div className="ap-card__detail">
                    <Globe2 size={13} /> <span>{facility.website}</span>
                  </div>
                )}
                {facility.emergencyServices && (
                  <div className="ap-card__detail">
                    <Ambulance size={13} /> <span>Emergency services</span>
                  </div>
                )}
              </div>

              <div className="ap-card__meta">
                <span>Submitted {formatDate(facility.createdAt)}</span>
                {facility.verifiedAt && (
                  <>
                    <span>·</span>
                    <span>Verified {formatDate(facility.verifiedAt)}</span>
                  </>
                )}
                <span>·</span>
                <span>NHIS: {facility.nhis}</span>
              </div>

              <div className="ap-card__actions">
                {facility.status !== 'VERIFIED' && (
                  <button
                    className="ap-icon-btn ap-icon-btn--primary"
                    onClick={() => updateStatus(facility, 'VERIFIED', `"${facility.name}" is now live in Facilities search.`)}
                    disabled={busy}
                  >
                    {busy ? <Loader2 size={13} className="ap-spin" /> : <ShieldCheck size={13} />}
                    {facility.status === 'PENDING' ? 'Verify & publish' : 'Reinstate'}
                  </button>
                )}
                {facility.status === 'VERIFIED' && (
                  <button
                    className="ap-icon-btn ap-icon-btn--warn"
                    onClick={() => updateStatus(facility, 'SUSPENDED', `"${facility.name}" suspended — no longer visible to patients.`)}
                    disabled={busy}
                  >
                    {busy ? <Loader2 size={13} className="ap-spin" /> : <ShieldOff size={13} />}
                    Suspend
                  </button>
                )}
                {facility.status === 'PENDING' && (
                  <button
                    className="ap-icon-btn"
                    onClick={() => updateStatus(facility, 'SUSPENDED', `"${facility.name}" declined and moved to suspended.`)}
                    disabled={busy}
                  >
                    <ShieldQuestion size={13} /> Decline
                  </button>
                )}
                <button
                  className="ap-icon-btn ap-icon-btn--danger"
                  onClick={() => handleDelete(facility)}
                  disabled={busy}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          );
        })}

        <p className="ap-header__eyebrow" style={{ marginTop: 24 }}>
          <Link href="/admin/providers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={13} /> Back to Provider Verification
          </Link>
        </p>
      </div>
    </div>
  );
}