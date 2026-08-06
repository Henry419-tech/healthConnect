'use client'

import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import NotificationPanel from './NotificationPanel';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { signOut } from 'next-auth/react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import '@/styles/dashboard-mobile.css';
import CookieConsentBanner from './CookieConsentBanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  showFooter?: boolean;
  locked?: boolean;
  className?: string;
}

/* ── Session timeout warning modal ────────────────────────────────────── */
function TimeoutWarningModal({ onStay }: { onStay: () => void }) {
  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 9998, backdropFilter: 'blur(4px)',
      }} />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'var(--hc-card)', border: '1px solid var(--hc-border)',
        borderRadius: 16, padding: '2rem', maxWidth: 360, width: '90%',
        zIndex: 9999, textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,170,0,0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem', color: 'var(--hc-warning, #ffaa00)',
        }}>
          <Clock size={26} />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--hc-text)' }}>
          Still there?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--hc-text2)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
          Your session will expire in 2 minutes due to inactivity.
          Your health data is protected — please confirm you&apos;re still here.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            style={{
              flex: 1, padding: '0.65rem', borderRadius: 8,
              border: '1px solid var(--hc-border)',
              background: 'transparent', color: 'var(--hc-text2)',
              cursor: 'pointer', fontSize: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
          <button
            onClick={onStay}
            style={{
              flex: 1, padding: '0.65rem', borderRadius: 8,
              border: 'none', background: 'var(--hc-teal)',
              color: 'var(--hc-text-on-teal, #000)', cursor: 'pointer', fontSize: 14,
              fontWeight: 600, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <RefreshCw size={14} /> Stay logged in
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Layout ───────────────────────────────────────────────────────────── */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab = '/dashboard',
  showFooter = true,
  locked = false,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { showWarning, stayLoggedIn } = useSessionTimeout();

  const layoutClass = [
    'hc-layout',
    locked    ? 'hc-layout--locked' : '',
    className,
  ].filter(Boolean).join(' ');

  const mainClass = [
    'hc-layout__main',
    collapsed ? 'hc-layout__main--collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClass} style={locked ? { height: '100svh', overflow: 'hidden' } : undefined}>
      <DashboardHeader
        activeTab={activeTab}
        onSidebarToggle={setCollapsed}
        locked={locked}
      />
      <div
        className={mainClass}
        style={locked ? { height: '100%', overflow: 'hidden', paddingTop: 0, paddingBottom: 0, marginLeft: 0 } : undefined}
      >
        <main
          className="hc-layout__content"
          style={locked ? { display: 'flex', flexDirection: 'column', flex: '1 1 0', overflow: 'hidden', minHeight: 0, height: 0 } : undefined}
        >
          {children}
        </main>
        {showFooter && <DashboardFooter />}
      </div>
      {showWarning && <TimeoutWarningModal onStay={stayLoggedIn} />}
      <CookieConsentBanner />
      {/* The one notifications dropdown/sheet — every NotificationBell in
          the tree (DashboardHeader's, each page's own db-topbar bell, and
          MobTopbarMenu's) opens this same instance. Provider lives up in
          the root layout.tsx (a true ancestor of every page), so pages can
          also call useRegisterNotifications()/useNotifications() directly
          in their own top-level body — see NotificationsContext.tsx. */}
      <NotificationPanel />
    </div>
  );
};

export default DashboardLayout;