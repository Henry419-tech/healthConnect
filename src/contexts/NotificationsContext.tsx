'use client';

// src/contexts/NotificationsContext.tsx
//
// Single pipeline for every "bell icon" notification in the app. Mounted
// once in the root src/app/layout.tsx (alongside DarkModeProvider /
// LanguageProvider), so every page — and every component underneath it —
// shares the exact same bell state: one fetch, one read-state store, one
// panel. Being a root-level provider (a genuine ancestor of every page)
// also means pages can call useRegisterNotifications()/useNotifications()
// directly in their own top-level body, not just via nested components.
// IMPORTANT: don't move this provider down into DashboardLayout.tsx —
// pages render <DashboardLayout> themselves, which makes the page the
// PARENT of the provider rather than a descendant, so a page's own
// top-level hook calls silently can't see it.
//
// Two kinds of sources feed into the same merged list:
//
//  - GLOBAL — fetched once, here: the public health-alerts API
//    (public_health / facility / calendar) plus a client-computed NHIS
//    renewal check. Same two sources AlertsPanel.tsx used to fetch
//    independently on every page that rendered it. Read-state persists
//    server-side per (user, notification id) via GET/POST /api/notifications
//    — see NotificationRead in schema.prisma — so "seen" survives reloads
//    AND syncs across devices, instead of living in localStorage.
//
//  - CONTEXTUAL — page-specific tips (Emergency's nearest-ER/location/
//    Medical-ID nudges, Facilities' GPS/search state) that a page
//    contributes only while it's mounted, via useRegisterNotifications()
//    below. Read-state for these is in-memory only (resets on
//    navigation/reload) — they're ambient "right now" info, not
//    something to permanently dismiss like a health advisory.
//
// AlertsPanel.tsx and the bespoke db-notif-panel JSX that used to live in
// Emergency/Facilities/Dashboard/Find Care/Profile are gone — this + the
// NotificationBell / NotificationPanel components fully replace them.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { AlertTriangle, Building2, Calendar, Shield } from 'lucide-react';
import { getNhisExpiryInfo } from '@/lib/nhisExpiry';
import type { AppNotification, HealthAlert } from '@/lib/notifications/types';

/* ══════════════════════════════════════════════════════════════════
   GLOBAL SOURCE 1 — public health alerts (/api/health-alerts)
   ══════════════════════════════════════════════════════════════════ */
const CACHE_KEY = 'hc-alerts-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheShape { cachedAt: number; alerts: HealthAlert[] }

function readCache(): HealthAlert[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed.alerts;
  } catch {
    return null;
  }
}
function writeCache(alerts: HealthAlert[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), alerts })); }
  catch { /* localStorage blocked (private mode etc.) */ }
}
async function fetchPublicAlerts(): Promise<HealthAlert[]> {
  const res = await fetch('/api/health-alerts');
  if (!res.ok) throw new Error('Failed to load health alerts');
  const data = await res.json();
  return data.alerts ?? [];
}

/* ══════════════════════════════════════════════════════════════════
   GLOBAL SOURCE 2 — personal NHIS expiry check (/api/health-profile)
   Public/shared health-alerts can't carry anything user-specific, so
   this one is computed client-side per signed-in user and merged in
   for display only — same approach AlertsPanel.tsx used.
   ══════════════════════════════════════════════════════════════════ */
const PERSONAL_CACHE_KEY = 'hc-personal-alerts-cache';
const PERSONAL_CACHE_TTL_MS = 60 * 60 * 1000;

function readPersonalCache(): HealthAlert[] | null {
  try {
    const raw = localStorage.getItem(PERSONAL_CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > PERSONAL_CACHE_TTL_MS) return null;
    return parsed.alerts;
  } catch {
    return null;
  }
}
function writePersonalCache(alerts: HealthAlert[]) {
  try { localStorage.setItem(PERSONAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), alerts })); }
  catch { /* localStorage blocked */ }
}
async function fetchPersonalAlerts(): Promise<HealthAlert[]> {
  try {
    const res = await fetch('/api/health-profile');
    if (!res.ok) return []; // not signed in, or no profile yet — no personal alerts
    const data = await res.json();
    const nhisCard = data?.profile?.nhisCard;
    const info = getNhisExpiryInfo(nhisCard?.expiryDate, nhisCard?.issuedDate);
    if (info.status !== 'expiring' && info.status !== 'expired') return [];

    // Stable for the calendar day (not the millisecond) so this doesn't
    // read as "new" on every single mount while the card sits in the
    // same expiring/expired state.
    const today = new Date();
    const stableCreatedAt = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    const alert: HealthAlert = {
      id: 'nhis-expiry',
      title: info.status === 'expired' ? 'NHIS card has expired' : 'NHIS card renewal due soon',
      body: `${info.label}${info.estimated ? ' (estimated from issue date — add the exact expiry date for accuracy)' : ''}. Update it in your Medical ID.`,
      type: 'nhis_expiry',
      severity: info.status === 'expired' ? 'critical' : 'warning',
      region: null,
      source: 'Your Medical ID',
      active: true,
      createdAt: stableCreatedAt,
      expiresAt: null,
    };
    return [alert];
  } catch {
    return [];
  }
}

/* ── HealthAlert -> AppNotification ──────────────────────────────── */
const TYPE_CONFIG: Record<HealthAlert['type'], { label: string; icon: AppNotification['icon'] }> = {
  public_health: { label: 'Public Health', icon: AlertTriangle },
  facility:      { label: 'Facility Update', icon: Building2 },
  calendar:      { label: 'Health Calendar', icon: Calendar },
  nhis_expiry:   { label: 'NHIS Renewal', icon: Shield },
};

// Severity drives colour: public_health typically swings red/amber by
// severity; facility and calendar have a fixed brand colour regardless
// of severity.
function severityColor(alert: HealthAlert): AppNotification['color'] {
  if (alert.type === 'facility') return 'teal';
  if (alert.type === 'calendar') return 'violet';
  if (alert.severity === 'critical') return 'red';
  if (alert.severity === 'warning') return 'amber';
  return 'teal';
}

function toAppNotification(alert: HealthAlert): AppNotification {
  const { label, icon } = TYPE_CONFIG[alert.type];
  return {
    id: alert.id,
    title: alert.title,
    body: alert.body,
    icon,
    color: severityColor(alert),
    label: label.toUpperCase(),
    source: alert.source,
    region: alert.region,
    createdAt: alert.createdAt,
    scope: 'global',
    cta:
      alert.type === 'calendar'   ? { href: '/find-care', label: 'Find your nearest centre' } :
      alert.type === 'nhis_expiry' ? { href: '/profile?modal=medicalId', label: 'Update your NHIS card' } :
      undefined,
  };
}

/* ══════════════════════════════════════════════════════════════════
   CONTEXT
   ══════════════════════════════════════════════════════════════════ */
// Global-scope read-state now lives server-side (NotificationRead rows via
// /api/notifications) rather than a localStorage key — see header comment.
//
// That also changes how same-device cross-tab sync works: a plain
// `storage` event listener only fires for localStorage writes, so it can't
// see a POST to the server. BroadcastChannel is the direct replacement —
// same "mark read in one tab, other open tabs update instantly" UX, just
// over a same-origin message channel instead of a storage write. It's
// purely a same-device speed-up; cross-device sync already works via the
// server fetch on each tab's mount.
const BROADCAST_CHANNEL_NAME = 'hc-notifications';

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  markAllRead: () => void;
  loading: boolean;
  error: boolean;
  /** Internal — use the useRegisterNotifications() hook below instead of calling these directly. */
  _registerSource: (key: string, items: AppNotification[]) => void;
  _unregisterSource: (key: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [globalItems, setGlobalItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contextualBySource, setContextualBySource] = useState<Record<string, AppNotification[]>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [seenGlobal, setSeenGlobal] = useState<Set<string>>(new Set());
  const [seenContextual, setSeenContextual] = useState<Set<string>>(new Set());
  const hasHydratedSeen = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Same-device cross-tab sync: when another tab marks ids read, merge them
  // in here immediately instead of waiting for this tab's next mount/refetch.
  // Not supported in every browser (older Safari) — feature-detected, and
  // the server fetch on mount is the fallback either way.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent) => {
      const ids = event.data?.ids;
      if (event.data?.type !== 'read' || !Array.isArray(ids)) return;
      setSeenGlobal(prev => {
        let changed = false;
        const next = new Set(prev);
        for (const id of ids) if (typeof id === 'string' && !next.has(id)) { next.add(id); changed = true; }
        return changed ? next : prev;
      });
    };
    return () => channel.close();
  }, []);

  // Hydrate persisted "seen" ids once, from the server (per-user, so it
  // survives reloads AND syncs across devices) instead of localStorage.
  // Not signed in / request failed -> start from an empty read set, same
  // graceful fallback the old localStorage version had in private browsing.
  useEffect(() => {
    if (hasHydratedSeen.current) return;
    hasHydratedSeen.current = true;
    (async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.readIds)) setSeenGlobal(new Set(data.readIds));
      } catch { /* ignore — bell just starts fully unread this session */ }
    })();
  }, []);

  // Fetch both global sources once per app load — each individually
  // cached for an hour, same cadence the old AlertsPanel.tsx used.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cachedPersonal = readPersonalCache();
        const personal = cachedPersonal ?? await fetchPersonalAlerts();
        if (!cachedPersonal) writePersonalCache(personal);

        const cachedPublic = readCache();
        const pub = cachedPublic ?? await fetchPublicAlerts();
        if (!cachedPublic) writeCache(pub);

        if (cancelled) return;
        // Personal first — a warning about your own NHIS card is more
        // actionable than a regional advisory.
        setGlobalItems([...personal, ...pub].map(toAppNotification));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const registerSource = useCallback((key: string, items: AppNotification[]) => {
    setContextualBySource(prev => (prev[key] === items ? prev : { ...prev, [key]: items }));
  }, []);
  const unregisterSource = useCallback((key: string) => {
    setContextualBySource(prev => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const contextualItems = useMemo(
    () => Object.values(contextualBySource).flat(),
    [contextualBySource]
  );

  // Contextual (page-relevant right now) items first, then global alerts.
  // `read` is computed here (not by whoever registered the item) so both
  // unreadCount and the /notifications history page's New/Earlier grouping
  // read from one place instead of each re-deriving it against the seen sets.
  const items = useMemo(
    () => [...contextualItems, ...globalItems].map(n => ({
      ...n,
      read: n.scope === 'global' ? seenGlobal.has(n.id) : seenContextual.has(n.id),
    })),
    [contextualItems, globalItems, seenGlobal, seenContextual]
  );

  const unreadCount = useMemo(
    () => items.filter(n => !n.silent && !n.read).length,
    [items]
  );

  // App badge (Badging API) — puts the unread count on the PWA's
  // home-screen/taskbar icon when installed, no panel open required.
  // Chrome/Edge desktop + Android support it; Safari/Firefox don't —
  // optional chaining makes this a silent no-op there rather than a
  // runtime error. See src/types/app-badging.d.ts for the ambient types.
  useEffect(() => {
    if (unreadCount > 0) {
      navigator.setAppBadge?.(unreadCount)?.catch(() => { /* not supported/permitted — ignore */ });
    } else {
      navigator.clearAppBadge?.()?.catch(() => { /* ignore */ });
    }
  }, [unreadCount]);

  const markAllRead = useCallback(() => {
    setSeenGlobal(prev => {
      const newlySeen: string[] = [];
      const next = new Set(prev);
      for (const n of items) if (n.scope === 'global' && !next.has(n.id)) { next.add(n.id); newlySeen.push(n.id); }
      if (newlySeen.length > 0) {
        // Update local state immediately — the panel shouldn't wait on the
        // network — and persist in the background. Best-effort: a failed
        // request just means this batch re-appears as unread next reload,
        // the same graceful degradation the old localStorage version had
        // when writes were blocked (private browsing etc).
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: newlySeen }),
        }).catch(() => { /* best-effort */ });
        // Tell other open tabs on this device right away, rather than
        // making them wait for their own next mount to refetch.
        channelRef.current?.postMessage({ type: 'read', ids: newlySeen });
      }
      return newlySeen.length > 0 ? next : prev;
    });
    setSeenContextual(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const n of items) if (n.scope === 'contextual' && !next.has(n.id)) { next.add(n.id); changed = true; }
      return changed ? next : prev;
    });
  }, [items]);

  const open = useCallback(() => { setIsOpen(true); markAllRead(); }, [markAllRead]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) markAllRead();
      return next;
    });
  }, [markAllRead]);

  const value: NotificationsContextValue = {
    items, unreadCount, isOpen, open, close, toggle, markAllRead, loading, error,
    _registerSource: registerSource,
    _unregisterSource: unregisterSource,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

/** Read bell state / control the panel from anywhere under DashboardLayout. */
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationsProvider>');
  return ctx;
}

/**
 * Contribute a page's own notifications (Emergency's nearest-ER tip,
 * Facilities' GPS/search state, etc.) into the shared bell feed.
 *
 * Pass a memoized array (the pages that use this already build their list
 * with useMemo) — items are only re-registered when the array reference
 * changes. Automatically removed from the feed when the page unmounts.
 */
export function useRegisterNotifications(sourceKey: string, items: AppNotification[]) {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useRegisterNotifications must be used within <NotificationsProvider>');
  const { _registerSource, _unregisterSource } = ctx;

  useEffect(() => {
    _registerSource(sourceKey, items);
    return () => _unregisterSource(sourceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, items]);
}