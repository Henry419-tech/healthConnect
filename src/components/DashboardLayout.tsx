'use client'

import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import '@/styles/dashboard-mobile.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  /**
   * Show the footer below page content.
   * Default: true — dashboard, profile, emergency, and other scrollable pages.
   * Set false for viewport-locked pages (symptom checker) where footer would
   * break the 100dvh layout.
   */
  showFooter?: boolean;
  /**
   * Lock the layout to 100dvh with overflow:hidden.
   * Use for pages that manage their own internal scroll (e.g. symptom checker).
   * Adds hc-layout--locked class which is consumed by symptom-checker.css.
   */
  locked?: boolean;
  /**
   * Extra class names forwarded to the root .hc-layout element.
   * Used by the dashboard page to add hc-layout--has-mob-topbar, which
   * tells dashboard-header.css to suppress the generic hc-topbar /
   * hc-bottom-nav and show the dashboard's custom mob-topbar / mob-tab-bar
   * instead — no !important CSS overrides required.
   *
   * Example: className="hc-layout--has-mob-topbar"
   */
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab = '/dashboard',
  showFooter = true,
  locked = false,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);

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
    <div className={layoutClass}>
      <DashboardHeader
        activeTab={activeTab}
        onSidebarToggle={setCollapsed}
      />
      <div className={mainClass}>
        <main className="hc-layout__content">
          {children}
        </main>
        {showFooter && <DashboardFooter />}
      </div>
    </div>
  );
};

export default DashboardLayout;