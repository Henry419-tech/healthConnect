'use client';

// src/components/NotificationBell.tsx
//
// The one bell button, used in every topbar (desktop sidebar hc-topbar,
// each page's own db-topbar, and the shared mobile mob-topbar via
// MobTopbarMenu). Reads unread state from NotificationsContext and
// toggles the single shared NotificationPanel — no per-page state, refs,
// or click-outside handling needed anymore.

import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';

interface NotificationBellProps {
  /** Button classes — each topbar already styles its own icon buttons; this just slots in. */
  className: string;
  /** The unread-dot class for this topbar (e.g. 'db-topbar__notif-dot', 'hc-topbar__bell-dot', 'mob-topbar__bell-dot'). */
  dotClassName: string;
  size?: number;
  'aria-label'?: string;
}

export default function NotificationBell({
  className,
  dotClassName,
  size = 18,
  'aria-label': ariaLabel = 'Notifications',
}: NotificationBellProps) {
  const { unreadCount, toggle } = useNotifications();

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-label={ariaLabel}
      // Lets NotificationPanel's outside-click handler recognize any bell,
      // anywhere, as "not outside" — so no ref-passing is needed per page.
      data-notification-trigger
    >
      <Bell size={size} />
      {unreadCount > 0 && <span className={dotClassName} />}
    </button>
  );
}
