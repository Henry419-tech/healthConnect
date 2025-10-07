'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { 
  Heart, 
  User, 
  Bell,
  Moon,
  Sun,
  LogOut,
  Settings
} from 'lucide-react';

interface DashboardHeaderProps {
  activeTab?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ activeTab }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || null;
  const userImage = session?.user?.image || null;
  
  // Optimized scroll handler
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const shouldBeScrolled = scrollTop > 50;
    
    if (isScrolled !== shouldBeScrolled) {
      setIsScrolled(shouldBeScrolled);
    }
  }, [isScrolled]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const throttledScrollHandler = () => {
      if (timeoutId) return;
      
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 16);
    };

    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [handleScroll]);

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path: string) => {
    return pathname === path || activeTab === path;
  };

  return (
    <header className={`dashboard-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="dashboard-header-content">
        <div className="dashboard-header-left">
          {/* Logo */}
          <div className="dashboard-logo">
            <div className="dashboard-logo-icon">
              <Heart size={20} className="dashboard-logo-heart" />
            </div>
            <h1 className="dashboard-logo-text">HealthConnect Navigator</h1>
          </div>

          {/* Navigation */}
          <nav className="dashboard-nav">
            <button 
              className={`dashboard-nav-item ${isActive('/dashboard') ? 'dashboard-nav-item-active' : ''}`}
              onClick={() => router.push('/dashboard')}
              type="button"
            >
              Dashboard
            </button>
            <button 
              className={`dashboard-nav-item ${isActive('/facilities') ? 'dashboard-nav-item-active' : ''}`}
              onClick={() => router.push('/facilities')}
              type="button"
            >
              Facilities
            </button>
            <button 
              className={`dashboard-nav-item ${isActive('/symptom-checker') ? 'dashboard-nav-item-active' : ''}`}
              onClick={() => router.push('/symptom-checker')}
              type="button"
            >
              Symptom Checker
            </button>
            <button 
              className={`dashboard-nav-item ${isActive('/emergency') ? 'dashboard-nav-item-active' : ''}`}
              onClick={() => router.push('/emergency')}
              type="button"
            >
              Emergency
            </button>
          </nav>
        </div>

        {/* User Actions */}
        <div className="dashboard-user-actions">
          {/* Dark Mode Toggle */}
          <button 
            className="dashboard-action-btn dark-mode-toggle-prominent"
            onClick={toggleDarkMode}
            type="button"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>

          {/* Notifications */}
          <button 
            className="dashboard-action-btn dashboard-notification-btn"
            type="button"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="dashboard-notification-dot"></span>
          </button>
          
          {/* User Menu with Profile Image */}
          <div className="dashboard-user-menu">
            <button 
              className="dashboard-action-btn dashboard-user-btn"
              type="button"
              aria-label="User menu"
            >
              {/* Profile Image or Avatar - Will automatically update when session changes */}
              <div className="dashboard-user-avatar">
                {userImage ? (
                  <img 
                    src={userImage} 
                    alt={userName}
                    className="dashboard-user-avatar-image"
                    key={userImage} // Force re-render when image URL changes
                  />
                ) : (
                  <div className="dashboard-user-avatar-placeholder">
                    {getInitials(userName)}
                  </div>
                )}
              </div>
              
              <div className="dashboard-user-info">
                <span className="dashboard-user-name">{userName}</span>
                {userEmail && <span className="dashboard-user-email">{userEmail}</span>}
              </div>
            </button>
            
            {/* Dropdown Menu */}
            <div className="dashboard-user-dropdown">
              <button 
                className="dashboard-dropdown-item" 
                onClick={() => router.push('/profile')}
                type="button"
              >
                <User size={16} />
                Profile
              </button>
              <button 
                className="dashboard-dropdown-item dashboard-signout-btn" 
                onClick={handleSignOut}
                type="button"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;