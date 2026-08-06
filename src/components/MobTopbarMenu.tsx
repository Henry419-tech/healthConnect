'use client'

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import NotificationBell from './NotificationBell';

// Settings now lives in the combined Profile + Settings tab (Section 14),
// and the ⋮ dropdown was removed entirely — dark mode is now a standalone
// topbar icon button. See HEALTHNAV handoff Section 7.
//
// The avatar button that used to sit here was removed per Section 7 spec:
// Profile is now a bottom tab (MobTabBar), so a second way to reach it from
// the topbar was redundant. Tapping the topbar no longer routes anywhere —
// it's just [Bell] [Dark mode] now, exactly per spec.
//
// Bell state used to be threaded in via onBellClick/hasUnread/bellRef props
// from every single page that rendered this — now it reads straight from
// NotificationsContext (single pipeline, see src/contexts/NotificationsContext.tsx),
// so no page needs to wire any of that up anymore.
const MobTopbarMenu: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="mob-tmenu">
      <NotificationBell
        className="mob-topbar__btn mob-topbar__bell"
        dotClassName="mob-topbar__bell-dot"
      />

      {/* Dark mode — standalone icon button, no longer tucked in a ⋮ dropdown */}
      <button
        className="mob-topbar__btn"
        type="button"
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleDarkMode}
        suppressHydrationWarning
      >
        {isDarkMode ? <Sun size={18} suppressHydrationWarning /> : <Moon size={18} suppressHydrationWarning />}
      </button>
    </div>
  );
};

export default MobTopbarMenu;
