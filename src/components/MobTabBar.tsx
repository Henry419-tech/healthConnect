'use client';
/**
 * MobTabBar
 *
 * Shared mobile bottom navigation component — the final 4-tab spec
 * (HEALTHNAV handoff Section 7): Home, Find, Emergency, Profile.
 *
 * The old 4th slot ("More", opening MobMorePopup) is gone. Health Profile
 * and Settings are now one combined /profile tab (Section 14), so the
 * 4th button is a plain direct link — no popup, no toggle state needed.
 *
 * Props:
 *   currentPath    — used to derive the active tab highlight
 *   hidden         — adds mob-tab-bar--hidden class for pages that
 *                    hide the bar when the keyboard is open
 *   showMore / onMoreClick — deprecated, unused. Kept optional so any
 *                    stray caller still passing them keeps compiling.
 *                    Ignored here.
 *
 * Labels are wired through useTranslation() so they switch automatically
 * when the user changes language.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Search, MapPin, Phone, User } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface MobTabBarProps {
  currentPath:  string;
  hidden?:      boolean;
  /** @deprecated no longer used — kept for backward compatibility with v2 pages */
  showMore?:    boolean;
  /** @deprecated no longer used — kept for backward compatibility with v2 pages */
  onMoreClick?: () => void;
}

export default function MobTabBar({
  currentPath,
  hidden = false,
}: MobTabBarProps) {
  const router = useRouter();
  const { t }  = useTranslation();

  // /find-care, /find-care/results, /find-care/doctor/[id], and the legacy
  // /facilities map view all highlight the Find tab.
  const isActive = (path: string) =>
    path === '/find-care'
      ? currentPath.startsWith('/find-care') || currentPath === '/facilities'
      : currentPath === path;

  // Find tab icon is context-aware: the map-based /facilities view gets the
  // location pin (it's a "where am I" surface), while /find-care and its
  // results page get the magnifying glass (they're a "search for X" flow).
  const findIcon = currentPath === '/facilities' ? MapPin : Search;

  const TABS = [
    { path: '/dashboard',  key: 'nav.home',    icon: Heart,     label: 'Home' },
    { path: '/find-care',  key: 'nav.find',    icon: findIcon,  label: 'Find' },
  ] as const;

  return (
    <nav
      className={`mob-tab-bar${hidden ? ' mob-tab-bar--hidden' : ''}`}
      aria-label="Main navigation"
    >
      <div className="mob-tab-bar__inner">

        {/* Home, Find */}
        {TABS.map(({ path, key, icon: Icon, label }) => (
          <button
            key={path}
            className={`mob-tab-btn${isActive(path) ? ' active' : ''}`}
            onClick={() => router.push(path)}
            type="button"
            aria-label={t(key, label)}
            aria-current={isActive(path) ? 'page' : undefined}
          >
            <span className="mob-tab-btn__icon"><Icon size={22} /></span>
            <span>{t(key, label)}</span>
          </button>
        ))}

        {/* Emergency — always uses /emergency; active when currentPath is /emergency */}
        <button
          className={`mob-tab-btn mob-tab-btn--emergency${isActive('/emergency') ? ' active' : ''}`}
          onClick={() => router.push('/emergency')}
          type="button"
          aria-label={t('nav.emergency', 'Emergency')}
          aria-current={isActive('/emergency') ? 'page' : undefined}
        >
          <span className="mob-tab-emergency-icon"><Phone size={20} /></span>
          <span>{t('nav.emergency', 'Emergency')}</span>
        </button>

        {/* Profile — direct link, replaces the old More popup toggle */}
        <button
          className={`mob-tab-btn${isActive('/profile') ? ' active' : ''}`}
          onClick={() => router.push('/profile')}
          type="button"
          aria-label={t('nav.profile', 'Profile')}
          aria-current={isActive('/profile') ? 'page' : undefined}
        >
          <span className="mob-tab-btn__icon"><User size={22} /></span>
          <span>{t('nav.profile', 'Profile')}</span>
        </button>

      </div>
    </nav>
  );
}