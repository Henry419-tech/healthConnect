'use client'

import React from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  showNotifications?: boolean;
  className?: string;
  showFloatingBg?: boolean;
  showFooter?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab = 'dashboard',
  showNotifications = true,
  className = '',
  showFloatingBg = true,
  showFooter = true
}) => {
  return (
    <div className={`dashboard-container ${className}`}>
      {/* Floating Background Elements */}
      {showFloatingBg && (
        <>
          <div className="dashboard-bg-element dashboard-bg-element-1"></div>
          <div className="dashboard-bg-element dashboard-bg-element-2"></div>
          <div className="dashboard-bg-element dashboard-bg-element-3"></div>
        </>
      )}

      {/* Reusable Header */}
      <DashboardHeader 
        activeTab={activeTab}
      />

      {/* Main Content with proper padding for fixed header */}
      <main className={`dashboard-content ${showFooter ? 'with-footer' : ''}`}>
        {children}
      </main>

      {/* Footer */}
      {showFooter && <DashboardFooter />}
    </div>
  );
};

export default DashboardLayout;