// src/lib/notifications/types.ts
//
// Shared notification model for the single bell pipeline. Every topbar
// bell in the app (desktop sidebar, per-page desktop topbar, mobile
// topbar) reads from this one shape now via NotificationsContext,
// instead of each page inventing its own notification list + panel.
//
// See:
//   src/contexts/NotificationsContext.tsx  — owns the data, merges sources
//   src/components/NotificationBell.tsx    — the bell button
//   src/components/NotificationPanel.tsx   — the dropdown/sheet UI

import type { ComponentType } from 'react';

export type NotificationColor = 'red' | 'amber' | 'teal' | 'violet' | 'mint';

export interface AppNotification {
  /** Stable across renders/reloads — drives the React key AND read-state tracking. */
  id: string;
  title: string;
  body: string;
  icon: ComponentType<{ size: number }>;
  color: NotificationColor;
  /** Small badge label, e.g. "PUBLIC HEALTH", "NHIS RENEWAL". Contextual tips can skip it. */
  label?: string;
  source?: string;
  region?: string | null;
  /** ISO timestamp — drives sort order and the relative-time meta line. */
  createdAt: string;
  /**
   * 'global'     — health alerts / NHIS expiry. Shown on every page, and
   *                read-state persists server-side (NotificationRead rows,
   *                see /api/notifications), synced across devices.
   * 'contextual' — page-specific tips (Emergency's nearest-ER info,
   *                Facilities' GPS state) registered only while that page
   *                is mounted, via useRegisterNotifications(). Read-state
   *                is session-only — they're "right now" info, not
   *                something to permanently dismiss.
   */
  scope: 'global' | 'contextual';
  /** Doesn't count toward the unread badge (e.g. a "you're all caught up" placeholder). */
  silent?: boolean;
  /**
   * Computed by NotificationsContext when it builds `items` — true once the
   * id is in seenGlobal/seenContextual. Not something a registrar sets via
   * useRegisterNotifications(); it's derived, same idea as `unreadCount`
   * (which is in fact just items.filter(n => !n.read).length).
   */
  read?: boolean;
  /** A plain navigation target... */
  cta?: { href: string; label: string };
  /** ...or a client-side action (open Google Maps, retry a fetch, etc). Takes priority over cta if both are set. */
  onSelect?: () => void;
}

/** Shape returned by GET /api/health-alerts. Unchanged from the old
 *  AlertsPanel.tsx — kept here so the Dashboard "Health Updates" card can
 *  keep typing its own direct fetch without depending on the bell pipeline. */
export interface HealthAlert {
  id: string;
  title: string;
  body: string;
  type: 'public_health' | 'facility' | 'calendar' | 'nhis_expiry';
  severity: 'info' | 'warning' | 'critical';
  region: string | null;
  source: string;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}