'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { getRelativeTime } from '@/lib/activityTracker';
import {
  ArrowLeft,
  Activity,
  Hospital,
  Stethoscope,
  Heart,
  Search,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  MapPin,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import '@/styles/dashboard-header.css';
import '@/styles/activities.css';

interface ActivityItem {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

// ── Filter buckets ─────────────────────────────────────────────
// These map to what the app ACTUALLY fires via trackActivity(), not an
// idealized list. Verified call sites:
//   facility_found        → app/facilities/page.tsx (browsing/map)
//   facility_search        ┐
//   symptom_search         ├─ app/find-care/page.tsx + find-care/results (guided "Find Care" flow)
//   symptom_text_search    ┘
//   emergency_guide        → app/emergency/page.tsx (opening a first-aid guide)
// emergency_accessed / first_aid_viewed are defined in activityTracker.ts but
// never actually called anywhere — kept mapped here in case they get wired up.
const BUCKET_TYPES: Record<string, string[]> = {
  facility:  ['facility_found'],
  findcare:  ['facility_search', 'symptom_search', 'symptom_text_search'],
  emergency: ['emergency_guide', 'emergency_accessed', 'first_aid_viewed'],
};

// ── Colour + glow map per real activity type ──────────────────
const ACTIVITY_CONFIG: Record<string, {
  icon: any; color: string; glow: string; label: string; filterClass: string;
}> = {
  facility_found:        { icon: Hospital,    color: '#3b82f6', glow: 'rgba(59,130,246,0.35)', label: 'Facilities',           filterClass: 'facility'  },
  facility_search:       { icon: Stethoscope, color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)', label: 'Find Care',            filterClass: 'findcare'  },
  symptom_search:        { icon: Stethoscope, color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)', label: 'Find Care',            filterClass: 'findcare'  },
  symptom_text_search:   { icon: Stethoscope, color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)', label: 'Find Care',            filterClass: 'findcare'  },
  emergency_guide:       { icon: Heart,       color: '#ef4444', glow: 'rgba(239,68,68,0.35)',  label: 'Emergency/First Aid',  filterClass: 'emergency' },
  emergency_accessed:    { icon: Heart,       color: '#ef4444', glow: 'rgba(239,68,68,0.35)',  label: 'Emergency/First Aid',  filterClass: 'emergency' },
  first_aid_viewed:      { icon: Heart,       color: '#ef4444', glow: 'rgba(239,68,68,0.35)',  label: 'Emergency/First Aid',  filterClass: 'emergency' },
};
const DEFAULT_CONFIG = {
  icon: Activity, color: 'var(--hc-teal)', glow: 'var(--hc-teal-glow)', label: 'Activity', filterClass: '',
};

function getConfig(type: string) {
  return ACTIVITY_CONFIG[type] ?? DEFAULT_CONFIG;
}

const BUCKET_LABELS: Record<string, string> = {
  facility:  'Facilities',
  findcare:  'Find Care',
  emergency: 'Emergency/First Aid',
};

// ── Group activities by calendar date ─────────────────────────
function groupByDate(items: ActivityItem[]) {
  const groups: Record<string, ActivityItem[]> = {};
  const now      = new Date();
  const todayStr = now.toDateString();
  const yest     = new Date(now); yest.setDate(yest.getDate() - 1);
  const yestStr  = yest.toDateString();

  for (const item of items) {
    const key = new Date(item.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return Object.entries(groups).map(([key, entries]) => {
    let label: string;
    if      (key === todayStr) label = 'Today';
    else if (key === yestStr)  label = 'Yesterday';
    else {
      label = new Date(key).toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric',
      });
    }
    return { dateKey: key, label, entries };
  });
}

export default function ActivitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Smart back navigation — use ?from= param if present, else browser history, else /profile
  const handleBack = useCallback(() => {
    const from = searchParams.get('from');
    if (from) {
      router.push(from);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/profile');
    }
  }, [router, searchParams]);

  const [activities,         setActivities]         = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [filterType,         setFilterType]         = useState<string>('all');
  const [searchQuery,        setSearchQuery]        = useState('');

  // ── Sync dark mode class ─────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // ── Delete single activity ───────────────────────────────────
  const deleteActivity = async (id: string) => {
    try {
      const res = await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setActivities(prev => prev.filter(a => a.id !== id));
      setFilteredActivities(prev => prev.filter(a => a.id !== id));
    } catch {
      setError('Failed to delete activity. Please try again.');
    }
  };

  // ── Clear all / by type ──────────────────────────────────────
  const clearActivities = async () => {
    const scope = filterType !== 'all' ? `all ${(BUCKET_LABELS[filterType] ?? filterType).toLowerCase()}` : 'all';
    if (!confirm(`Clear ${scope} activities? This cannot be undone.`)) return;
    try {
      const typeParam = filterType !== 'all' ? BUCKET_TYPES[filterType]?.join(',') : undefined;
      await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, ...(typeParam && { type: typeParam }) }),
      });
      setActivities([]);
      setFilteredActivities([]);
    } catch {
      setError('Failed to clear activities.');
    }
  };

  // ── Auth guard ───────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const typeParam = filterType !== 'all' ? BUCKET_TYPES[filterType]?.join(',') : undefined;
      const url = typeParam
        ? `/api/activities?limit=100&type=${encodeURIComponent(typeParam)}`
        : '/api/activities?limit=100';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data.activities);
      setFilteredActivities(data.activities);
    } catch {
      setError('Failed to load activities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') fetchActivities();
  }, [status, filterType]);

  // ── Search filter ────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredActivities(activities);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredActivities(
        activities.filter(a =>
          a.title.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
        )
      );
    }
  }, [searchQuery, activities]);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // ── Group into timeline ──────────────────────────────────────
  const grouped = useMemo(() => groupByDate(filteredActivities), [filteredActivities]);

  // ── Loading screen — uniform hc-loading (matches ProfileContent) ────
  if (status === 'loading' || (status === 'authenticated' && isLoading && activities.length === 0)) {
    return (
      <div className="hc-loading">
        <div className="hc-loading__mark"><Heart size={26} /></div>
        <div className="hc-loading__brand">
          <span className="hc-loading__name">HealthConnect</span>
          <span className="hc-loading__sub">Navigator</span>
        </div>
        <div className="hc-loading__dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const filters = [
    { key: 'all',        label: 'All',                   icon: Activity,    cls: ''          },
    { key: 'facility',   label: 'Facilities',             icon: Hospital,    cls: 'facility'  },
    { key: 'findcare',   label: 'Find Care',              icon: Stethoscope, cls: 'findcare'  },
    { key: 'emergency',  label: 'Emergency/First Aid',    icon: Heart,       cls: 'emergency' },
  ];

  return (
    <div className="act-page">
      <DashboardHeader activeTab="/dashboard" />

      {/* ── Mobile top bar ───────────────────────────────────── */}
      <div className="act-mob-topbar">
        <div className="act-mob-topbar__left">
          <button
            className="act-mob-topbar__back"
            onClick={handleBack}
            type="button"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="act-mob-topbar__title">Activity History</span>
        </div>
        <div className="act-mob-topbar__right">
          <button
            className="act-mob-topbar__icon-btn"
            onClick={toggleDarkMode}
            type="button"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="act-page-header">
        <div>
          <h1 className="act-page-header__title">Activity History</h1>
          <p className="act-page-header__sub">Everything you've done so far</p>
        </div>
        <div className="act-page-header__actions">
          <button
            className="act-btn act-btn--ghost"
            onClick={fetchActivities}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? <Loader2 size={14} className="act-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
          <button
            className="act-btn act-btn--danger"
            onClick={clearActivities}
            disabled={filteredActivities.length === 0 || isLoading}
            type="button"
          >
            <Trash2 size={14} />
            {filterType !== 'all' ? `Clear ${BUCKET_LABELS[filterType] ?? filterType}` : 'Clear All'}
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="act-content">

        {/* Controls */}
        <div className="act-controls">
          {/* Search */}
          <div className="act-search">
            <Search size={16} className="act-search__icon" />
            <input
              className="act-search__input"
              type="text"
              placeholder="Search activities…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter chips */}
          <div className="act-filters">
            {filters.map(f => {
              const Icon = f.icon;
              const isActive = filterType === f.key;
              return (
                <button
                  key={f.key}
                  className={[
                    'act-filter-btn',
                    f.cls ? `act-filter-btn--${f.cls}` : '',
                    isActive ? 'act-filter-btn--active' : '',
                  ].join(' ')}
                  onClick={() => setFilterType(f.key)}
                  type="button"
                >
                  <Icon size={13} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results meta */}
        <div className="act-meta">
          <span className="act-meta__count">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
          </span>
          {searchQuery && (
            <>
              <span className="act-meta__dot" />
              <span className="act-meta__query">matching "{searchQuery}"</span>
            </>
          )}
          <span className="act-meta__dot" />
          <span className="act-meta__limit">{activities.length} / 200 max</span>
          {/* Refresh — mobile only, sits inline at end of meta row */}
          <button
            className="act-meta__refresh"
            onClick={fetchActivities}
            disabled={isLoading}
            type="button"
            aria-label="Refresh activities"
          >
            {isLoading ? <Loader2 size={14} className="act-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        {/* ── Timeline ──────────────────────────────────────── */}
        {/* Re-fetch overlay — shown when refreshing already-loaded data */}
        {isLoading && activities.length > 0 && (
          <div className="act-refresh-overlay">
            <div className="act-refresh-overlay__inner">
              <Loader2 size={20} className="act-spin" />
              <span>Refreshing…</span>
            </div>
          </div>
        )}
        {isLoading && activities.length === 0 ? null : error ? (
          <div className="act-state">
            <div className="act-state__icon act-state__icon--error">
              <AlertCircle size={28} />
            </div>
            <p className="act-state__title">Failed to Load Activities</p>
            <p className="act-state__desc">{error}</p>
            <button className="act-state__btn" onClick={fetchActivities} type="button">
              <RefreshCw size={15} /> Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="act-state">
            <div className="act-state__icon">
              <Activity size={28} />
            </div>
            <p className="act-state__title">No Activities Found</p>
            <p className="act-state__desc">
              {searchQuery
                ? `No activities match "${searchQuery}"`
                : filterType !== 'all'
                ? `No ${(BUCKET_LABELS[filterType] ?? filterType).toLowerCase()} activities yet`
                : 'Start using features to see your activity history'}
            </p>
            {(searchQuery || filterType !== 'all') && (
              <button
                className="act-state__btn act-state__btn--ghost"
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                type="button"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="act-timeline">
            {grouped.map(group => (
              <div key={group.dateKey} className="act-group">

                {/* ── Date separator ─────────────────────── */}
                <div className="act-group__date">
                  <span className="act-group__date-label">{group.label}</span>
                  <span className="act-group__count">
                    {group.entries.length} {group.entries.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {/* ── Entries ────────────────────────────── */}
                {group.entries.map(activity => {
                  const cfg  = getConfig(activity.activityType);
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={activity.id}
                      className="act-entry"
                      style={{
                        '--act-entry-color': cfg.color,
                        '--act-entry-glow':  cfg.glow,
                      } as React.CSSProperties}
                    >
                      <div
                        className="act-card"
                        style={{ '--act-color': cfg.color } as React.CSSProperties}
                      >
                        {/* Icon */}
                        <div
                          className="act-card__icon"
                          style={{
                            backgroundColor: `${cfg.color}1a`,
                            color: cfg.color,
                            border: `1px solid ${cfg.color}33`,
                          }}
                        >
                          <Icon size={20} />
                        </div>

                        {/* Body */}
                        <div className="act-card__body">
                          <div className="act-card__top">
                            <h3 className="act-card__title">{activity.title}</h3>
                            <span
                              className="act-card__badge"
                              style={{
                                backgroundColor: `${cfg.color}1a`,
                                color: cfg.color,
                                border: `1px solid ${cfg.color}33`,
                              }}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          {activity.description && (
                            <p className="act-card__desc">{activity.description}</p>
                          )}

                          <div className="act-card__meta">
                            <span className="act-card__time">
                              <Calendar size={11} />
                              {formatTime(activity.createdAt)}
                            </span>
                            <span className="act-card__relative">
                              {getRelativeTime(new Date(activity.createdAt))}
                            </span>
                          </div>

                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="act-card__tags">
                              {activity.metadata.facilityName && (
                                <span className="act-card__tag">
                                  <MapPin size={11} />
                                  {activity.metadata.facilityName}
                                </span>
                              )}
                              {activity.metadata.distance && (
                                <span className="act-card__tag">
                                  {activity.metadata.distance.toFixed(1)} km away
                                </span>
                              )}
                              {activity.metadata.urgencyLevel && (
                                <span className="act-card__tag">
                                  Urgency: {activity.metadata.urgencyLevel}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete — flat pill sibling outside the card */}
                      <button
                        className="act-card__delete"
                        onClick={(e) => { e.stopPropagation(); deleteActivity(activity.id); }}
                        type="button"
                        aria-label="Delete this activity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}