'use client'

import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  /**
   * Show the footer below page content.
   * Default: true — dashboard, profile, emergency, and other scrollable pages
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
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab = '/dashboard',
  showFooter = true,   // true keeps footer for dashboard, profile, emergency etc.
  locked = false,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const layoutClass = [
    'hc-layout',
    locked ? 'hc-layout--locked' : '',
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