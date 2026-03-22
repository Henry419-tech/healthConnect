'use client'

import '@/styles/dashboard-header.css';
import '@/styles/dashboard-mobile.css';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import {
  Home, MapPin, Bot, Phone, User,
  Bell, Moon, Sun, LogOut, PanelLeftClose,
  PanelLeftOpen, Menu, X,
} from 'lucide-react';

const HCLogo = ({ size = 28 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="115 55 460 363" fill="none"
    width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
    <defs>
      <linearGradient id="hcg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00d2ff"/>
        <stop offset="100%" stopColor="#0ea5e9"/>
      </linearGradient>
    </defs>
    <g fill="url(#hcg)">
      <path d="M330.32 403.63 c-4.20 -1.10 -7.56 -3.15 -11.03 -6.62 -5.78 -5.72 -7.88 -11.13 -7.88 -19.96 0 -2.73 0.32 -6.14 0.74 -7.61 2 -7.56 6.88 -13.55 13.86 -16.91 3.94 -1.89 4.25 -1.94 10.87 -2.15 6.35 -0.16 9.56 0.26 12.87 1.68 0.84 0.32 6.41 -3.99 32.03 -24.79 18.17 -14.81 25.31 -20.80 38.34 -32.30 11.97 -10.61 36.87 -35.19 45.01 -44.48 11.55 -13.18 24.94 -31.04 31.77 -42.22 22.16 -36.45 28.46 -72.63 18.17 -104.77 -8.09 -25.36 -28.15 -45.37 -53.25 -53.04 -7.88 -2.42 -13.13 -3.20 -21.16 -3.20 -18.17 0 -34.56 4.94 -49 14.81 -3.05 2.05 -7.67 6.09 -12.29 10.66 -10.29 10.24 -16.96 19.54 -25.42 35.45 -2.36 4.46 -5.04 8.93 -5.93 9.87 -1.68 1.73 -1.73 1.79 -5.78 1.58 -3.99 -0.16 -4.20 -0.21 -5.78 -2.05 -0.95 -1.05 -3.94 -5.78 -6.67 -10.45 -18.49 -31.61 -42.75 -50.83 -70.63 -55.98 -8.82 -1.63 -24.10 -0.21 -34.24 3.20 -11.45 3.83 -25.05 12.76 -33.03 21.64 -24.42 27.31 -29.04 62.49 -13.08 100.62 l0.79 1.94 25.94 0 c24.26 0 25.94 -0.05 26.21 -0.89 1.16 -4.15 9.66 -36.76 13.76 -52.67 2.78 -10.82 5.30 -20.38 5.62 -21.16 0.89 -2.26 2.36 -2.99 5.93 -2.99 3.31 0 5.04 0.74 6.04 2.63 0.42 0.79 14.60 71.21 20.06 99.41 0.63 3.36 1.31 6.14 1.47 6.14 0.16 0 0.79 -1.73 1.31 -3.78 0.53 -2.10 4.10 -15.18 7.93 -29.04 8.03 -29.04 7.35 -27.57 13.23 -27.57 5.51 0 5.04 -0.63 10.87 14.44 1.89 4.94 3.99 10.35 4.67 12.08 l1.26 3.15 24.21 0.26 24.16 0.26 1.21 1.16 c0.95 0.95 1.21 1.94 1.37 4.83 0.26 4.10 -0.26 5.41 -2.68 6.88 -1.63 1 -2.89 1.05 -28.20 1.05 -16.28 0 -27.26 -0.21 -28.41 -0.53 -2.36 -0.68 -3.20 -1.89 -5.46 -8.03 -1 -2.73 -1.89 -4.46 -2.05 -4.04 -0.16 0.42 -1.37 4.83 -2.68 9.72 -1.37 4.94 -4.83 17.54 -7.72 28.10 -2.89 10.56 -5.62 20.48 -6.04 22.06 -1.58 5.78 -3.10 7.35 -7.14 7.35 -3.05 0 -5.78 -1.16 -6.56 -2.78 -1 -1.94 -2.47 -8.56 -7.46 -33.19 -2.57 -12.97 -4.99 -24.68 -5.25 -26 -0.26 -1.31 -2.31 -11.66 -4.52 -23 -2.21 -11.34 -4.10 -20.59 -4.15 -20.48 -0.16 0.21 -4.46 16.33 -8.19 30.62 -4.20 16.07 -4.67 17.49 -6.35 18.91 l-1.58 1.31 -26.73 0 c-14.70 0 -26.73 0.11 -26.73 0.26 0 1 10.24 16.12 15.44 22.84 28.62 36.92 72.84 77.41 118.89 108.97 l7.46 5.04 6.72 -3.78 c9.45 -5.36 28.41 -18.07 37.13 -24.84 24.26 -18.96 40.96 -37.13 49.84 -54.35 4.46 -8.61 7.61 -18.38 8.51 -26.31 l0.32 -2.99 -3.83 -1.21 c-15.70 -4.73 -30.25 -19.54 -37.81 -38.28 -1.68 -4.25 -2.05 -5.83 -1.94 -7.98 l0.16 -2.73 5.78 -2.26 c4.04 -1.58 6.56 -2.26 8.40 -2.31 2.63 0 2.68 0.05 3.36 2 1.47 4.20 5.88 12.71 8.93 17.28 7.88 11.82 19.43 18.75 28.31 16.96 5.62 -1.16 10.35 -3.89 15.33 -8.88 6.25 -6.30 10.35 -12.71 14.44 -22.69 l1.79 -4.41 2.57 -0.16 c1.89 -0.11 3.62 0.26 6.62 1.47 7.40 2.89 8.19 3.47 8.19 5.51 0 4.52 -6.51 18.17 -12.39 26 -7.93 10.56 -16.44 17.07 -26.73 20.48 l-4.20 1.42 -0.68 5.46 c-2.78 22.95 -14.44 44.11 -36.60 66.43 -19.59 19.69 -44.80 38.28 -75.10 55.35 -3.73 2.10 -8.40 4.73 -10.35 5.83 -5.62 3.31 -6.20 3.15 -16.33 -3.83 -46.74 -32.14 -89.85 -70.16 -118.89 -104.77 -26 -30.98 -40.49 -59.76 -45.06 -89.43 -1.16 -7.61 -1.63 -25 -0.84 -32.82 2.73 -27.26 13.13 -49.31 31.67 -67.27 14.49 -14.02 32.30 -23.05 52.88 -26.73 6.20 -1.16 23.16 -1.63 29.46 -0.84 12.87 1.58 22.32 4.36 33.87 10.03 18.07 8.82 33.40 22.11 46.74 40.54 l3.57 4.94 4.20 -6.25 c6.77 -10.19 16.28 -20.74 25.05 -27.83 11.50 -9.40 26.42 -16.54 41.85 -20.11 5.15 -1.21 7.09 -1.31 21.69 -1.63 15.07 -0.26 16.38 -0.21 22.06 0.84 20.17 3.89 39.23 14.28 53.36 29.04 14.86 15.60 23.79 33.82 27.89 56.87 1.37 7.77 1.37 34.87 0 43.06 -5.25 31.14 -18.01 57.03 -44.69 90.33 -13.60 16.96 -33.56 37.55 -56.24 58.03 -16.54 14.91 -51.73 44.64 -69.58 58.82 -5.25 4.20 -4.94 3.62 -3.99 7.46 1.21 4.83 1.10 13.08 -0.21 17.28 -2.05 6.77 -6.88 12.24 -13.81 15.70 l-4.15 2.10 -6.67 -0.05 c-3.62 0 -7.67 -0.32 -8.98 -0.68z m11.82 -14.97 c3.15 -1.42 5.30 -3.47 6.77 -6.46 1.63 -3.31 1.73 -6.14 0.26 -9.35 -1.42 -3.15 -3.36 -5.15 -6.51 -6.62 -3.36 -1.63 -5.72 -1.58 -9.09 0.11 -2.94 1.47 -4.83 3.36 -6.51 6.67 -2.84 5.62 1.05 13.18 8.24 15.96 2.31 0.89 4.46 0.79 6.83 -0.32z"/>
      <path d="M387.51 163.48 c-2.15 -5.67 -6.72 -25.78 -8.61 -37.97 -1.37 -8.51 -1.63 -23.47 -0.58 -28.62 2.68 -13.18 12.29 -22.69 25.63 -25.36 3.41 -0.68 4.99 -1.31 6.04 -2.31 2.36 -2.15 3.52 -2.52 8.30 -2.52 4.78 0 6.46 0.53 8.51 2.73 3.99 4.25 3.62 12.76 -0.68 16.80 -2.10 1.94 -3.94 2.52 -7.72 2.52 -3.73 0 -6.98 -1.26 -8.61 -3.31 -0.58 -0.74 -1.26 -1.16 -1.52 -0.95 -0.26 0.26 -1.73 0.84 -3.26 1.37 -3.57 1.16 -8.77 5.88 -10.77 9.82 -2.47 4.99 -3.15 8.82 -2.78 15.91 0.47 9.30 3.68 27.52 7.14 40.54 0.89 3.26 1.58 6.72 1.58 7.72 0 1.79 -0.05 1.84 -4.20 3.41 -5.41 2.10 -7.72 2.15 -8.45 0.21z"/>
      <path d="M482.88 163.32 c-3.31 -1.31 -3.68 -1.63 -3.83 -3.10 -0.11 -0.84 1.16 -6.83 2.73 -13.29 5.15 -20.69 7.19 -36.97 5.62 -44.64 -1.73 -8.30 -7.30 -14.65 -15.49 -17.75 -1.52 -0.53 -1.52 -0.58 -1.16 -3.78 0.16 -1.73 0.32 -4.57 0.32 -6.25 l0 -3.10 2.52 0 c2.99 0 8.67 1.94 12.55 4.31 4.04 2.42 9.66 8.51 11.66 12.55 2.84 5.83 3.73 10.61 3.73 19.85 0 13.55 -2.57 29.72 -7.61 47.74 l-2.52 9.03 -2.42 -0.05 c-1.31 -0.05 -4.04 -0.74 -6.09 -1.52z"/>
      <path d="M456.73 87.96 c-1.16 -0.37 -2.63 -1.26 -3.36 -1.94 -4.15 -3.83 -4.41 -12.45 -0.53 -16.59 2.05 -2.21 3.73 -2.73 8.77 -2.73 4.57 0 4.88 0.05 6.30 1.47 1.73 1.79 2.42 5.57 1.94 11.13 -0.58 6.88 -2.84 9.45 -8.24 9.45 -1.58 -0.05 -3.78 -0.37 -4.88 -0.79z"/>
    </g>
  </svg>
);

interface DashboardHeaderProps {
  activeTab?: string;
  onSidebarToggle?: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { path: '/dashboard',       label: 'Dashboard',      icon: Home   },
  { path: '/facilities',      label: 'Facilities',      icon: MapPin  },
  { path: '/symptom-checker', label: 'Symptom Checker', icon: Bot    },
  { path: '/emergency',       label: 'Emergency Hub',   icon: Phone  },
  { path: '/profile',         label: 'Profile',         icon: User   },
];

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ activeTab, onSidebarToggle }) => {
  const { data: session } = useSession();
  const router   = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [collapsed,  setCollapsed]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const userName  = session?.user?.name  || 'User';
  const userEmail = session?.user?.email || null;
  const userImage = session?.user?.image || null;

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isActive = (path: string) => pathname === path || activeTab === path;

  const handleSignOut = async () => {
    try { await signOut({ callbackUrl: '/', redirect: true }); }
    catch (e) { console.error(e); }
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onSidebarToggle?.(next);
  };

  // Notify parent of initial state
  useEffect(() => { onSidebarToggle?.(false); }, []); // eslint-disable-line

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR
      ════════════════════════════════════════ */}
      <aside className={`hc-sidebar${collapsed ? ' hc-sidebar--collapsed' : ''}`}>

        {/* Logo + collapse toggle in same row */}
        <div className="hc-sidebar__logo">
          {/* Left: icon + text */}
          <div className="hc-sidebar__logo-inner">
            <HCLogo size={36} />
            <div className="hc-sidebar__logo-text">
              <span className="hc-sidebar__logo-title">HealthConnect</span>
              <span className="hc-sidebar__logo-sub">Navigator</span>
            </div>
          </div>
          {/* Toggle — always visible on the right */}
          <button
            className="hc-sidebar__toggle-btn"
            onClick={toggleCollapse}
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="hc-sidebar__nav">
          {!collapsed && <span className="hc-sidebar__nav-label">Main Menu</span>}
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`hc-sidebar__nav-item${isActive(path) ? ' hc-sidebar__nav-item--active' : ''}`}
              onClick={() => router.push(path)}
              type="button"
              title={collapsed ? label : undefined}
            >
              <span className="hc-sidebar__nav-indicator" />
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="hc-sidebar__bottom">
          {/* Dark mode toggle */}
          <button
            className="hc-sidebar__nav-item hc-sidebar__darkmode-btn"
            onClick={toggleDarkMode}
            type="button"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode
              ? <Sun size={18} />
              : <Moon size={18} />}
            {!collapsed && (
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </button>

          {/* User card */}
          <div className="hc-sidebar__user">
            <div className="hc-sidebar__user-avatar">
              {userImage
                ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
                : <span>{initials(userName)}</span>}
            </div>
            {!collapsed && (
              <>
                <div className="hc-sidebar__user-info">
                  <span className="hc-sidebar__user-name">{userName}</span>
                  {userEmail && <span className="hc-sidebar__user-email">{userEmail}</span>}
                </div>
                <button
                  className="hc-sidebar__signout-btn"
                  onClick={handleSignOut}
                  type="button"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE TOP BAR
      ════════════════════════════════════════ */}
      <header className="hc-topbar">
        <button
          className="hc-topbar__icon-btn"
          onClick={() => setDrawerOpen(true)}
          type="button"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className="hc-topbar__logo">
          <HCLogo size={26} />
          <span>HealthConnect</span>
        </div>

        <div className="hc-topbar__actions">
          <button
            className="hc-topbar__icon-btn"
            onClick={toggleDarkMode}
            type="button"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="hc-topbar__icon-btn hc-topbar__bell" type="button" aria-label="Notifications">
            <Bell size={18} />
            <span className="hc-topbar__bell-dot" />
          </button>
          <div className="hc-topbar__avatar">
            {userImage
              ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
              : <span>{initials(userName)}</span>}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MOBILE DRAWER OVERLAY
      ════════════════════════════════════════ */}
      {drawerOpen && (
        <div
          className="hc-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ════════════════════════════════════════
          MOBILE DRAWER
      ════════════════════════════════════════ */}
      <div className={`hc-drawer${drawerOpen ? ' hc-drawer--open' : ''}`}>
        <div className="hc-drawer__header">
          <div className="hc-drawer__user">
            <div className="hc-drawer__avatar">
              {userImage
                ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
                : <span>{initials(userName)}</span>}
            </div>
            <div>
              <p className="hc-drawer__user-name">{userName}</p>
              {userEmail && <p className="hc-drawer__user-email">{userEmail}</p>}
            </div>
          </div>
          <button
            className="hc-topbar__icon-btn"
            onClick={() => setDrawerOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="hc-drawer__nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`hc-drawer__nav-item${isActive(path) ? ' hc-drawer__nav-item--active' : ''}`}
              onClick={() => { router.push(path); setDrawerOpen(false); }}
              type="button"
            >
              <Icon size={19} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="hc-drawer__footer">
          <button
            className="hc-drawer__nav-item"
            onClick={toggleDarkMode}
            type="button"
          >
            {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            className="hc-drawer__nav-item hc-drawer__nav-item--danger"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut size={19} /><span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM NAV
      ════════════════════════════════════════ */}
      <nav className="hc-bottom-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            className={`hc-bottom-nav__item${isActive(path) ? ' hc-bottom-nav__item--active' : ''}`}
            onClick={() => router.push(path)}
            type="button"
          >
            <span className="mob-tab-btn__icon"><Icon size={21} /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default DashboardHeader;