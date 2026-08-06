'use client';

// src/components/NotificationPanel.tsx
//
// The one notifications dropdown/sheet in the app. Mounted once by
// DashboardLayout, opened by any NotificationBell anywhere in the tree —
// see NotificationsContext.tsx for where `items` comes from.
//
// Replaces: AlertsPanel.tsx (deleted) and the bespoke `.db-notif-panel`
// JSX that used to be duplicated in Emergency and Facilities' pages.
// Reuses the same alerts-panel.css visual system as the old AlertsPanel
// so the shell/animation/item-card look is unchanged for the person using
// the app — only the plumbing behind it changed.

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell as BellIcon, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationsContext';
import '@/styles/alerts-panel.css';

export default function NotificationPanel() {
  const { items, isOpen, close, loading, error } = useNotifications();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // "View all" no longer navigates anywhere — it just lifts the panel's own
  // max-height (see .alerts-panel--expanded in alerts-panel.css) so a long
  // list is visible without leaving the current page. Resets on every close
  // so the panel always reopens compact.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!isOpen) setExpanded(false); }, [isOpen]);

  // Toggling either direction can leave the list scrolled to a position
  // that no longer makes sense against the new height (mid-scroll when
  // collapsing, or just an odd starting point when expanding) — snap back
  // to the top so "View all"/"Show less" always starts from a clean state.
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [expanded]);

  // "View all" is only meaningful if there's actually more to see than the
  // collapsed height shows — a couple of alerts that already fit shouldn't
  // get a button that visibly does nothing when clicked. Re-checked
  // whenever the item count or loading/error state changes; not on window
  // resize (a rotated phone mid-session is a rare enough case to skip a
  // ResizeObserver for).
  const [canExpand, setCanExpand] = useState(false);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 1); // +1 — avoid a false positive from sub-pixel rounding
  }, [isOpen, items.length, loading, error]);

  // Close on outside click. Any bell button carries data-notification-trigger
  // so tapping a bell to open the panel doesn't immediately close it again.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !target.closest('[data-notification-trigger]')
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const countable = items.filter(n => !n.silent);

  const renderItem = (n: typeof items[number]) => {
    const Icon = n.icon;
    const clickable = Boolean(n.onSelect || n.cta);
    const handleActivate = () => {
      close();
      if (n.onSelect) n.onSelect();
      else if (n.cta) router.push(n.cta.href);
    };

    return (
      <div
        key={n.id}
        className={`alerts-panel__item alerts-panel__item--${n.color}${clickable ? ' alerts-panel__item--clickable' : ''}`}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? handleActivate : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter') handleActivate(); } : undefined}
      >
        <div className="alerts-panel__item-head">
          <span className={`alerts-panel__badge alerts-panel__badge--${n.color}`}>
            <Icon size={12} />{n.label ? ` ${n.label}` : ''}
          </span>
        </div>
        <p className="alerts-panel__item-title">{n.title}</p>
        <p className="alerts-panel__item-body">{n.body}</p>
        {(n.source || n.region) && (
          <p className="alerts-panel__item-meta">
            {n.source}
            {n.region ? ` · ${n.region}` : ''}
            {' · '}{formatRelativeTime(n.createdAt)}
          </p>
        )}
        {n.cta && !n.onSelect && (
          <span className="alerts-panel__item-cta">
            {n.cta.label} <ChevronRight size={12} />
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`alerts-panel${expanded ? ' alerts-panel--expanded' : ''}`}
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
      >
        <div className="alerts-panel__header">
          <BellIcon size={15} />
          <span className="alerts-panel__title">Notifications</span>
          {countable.length > 0 && <span className="alerts-panel__count">{countable.length}</span>}
          <button
            className="alerts-panel__close"
            onClick={close}
            type="button"
            aria-label="Close notifications"
          >
            <X size={15} />
          </button>
        </div>

        <div className="alerts-panel__list" ref={listRef} id="alerts-panel-list">
          {loading && items.length === 0 && !error && (
            <div className="alerts-panel__empty">
              <p>Loading notifications…</p>
            </div>
          )}

          {error && items.length === 0 && (
            <div className="alerts-panel__empty">
              <p>Couldn't load notifications — check your connection.</p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="alerts-panel__empty">
              <p>No active notifications — you're up to date ✓</p>
            </div>
          )}

          {items.map(renderItem)}
        </div>

        <div className={`alerts-panel__footer${(canExpand || expanded) ? ' alerts-panel__footer--split' : ''}`}>
          {(canExpand || expanded) && (
            <button
              type="button"
              className="alerts-panel__footer-link"
              onClick={() => setExpanded(prev => !prev)}
              aria-expanded={expanded}
              aria-controls="alerts-panel-list"
            >
              {expanded ? 'Show less' : 'View all'}
            </button>
          )}
          <button
            type="button"
            className="alerts-panel__footer-link"
            onClick={() => { close(); router.push('/profile#app-settings'); }}
          >
            Notification settings
          </button>
        </div>
      </div>

      <div className="alerts-panel__overlay" onClick={close} />
    </>
  );
}