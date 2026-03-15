'use client'

import '@/styles/dashboard-header.css';
import '@/styles/dashboard-mobile.css';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import {
  Heart, Home, MapPin, Bot, Phone, User,
  Bell, Moon, Sun, LogOut, PanelLeftClose,
  PanelLeftOpen, Menu, X,
} from 'lucide-react';

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
            <div className="hc-sidebar__logo-mark">
              <Heart size={15} />
            </div>
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
          <Heart size={15} />
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
            <Icon size={21} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default DashboardHeader;