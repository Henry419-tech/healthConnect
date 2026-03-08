'use client';

/**
 * DarkModeContext
 *
 * Priority order:
 *  1. User's explicit choice (stored in localStorage as "hc-theme": "dark" | "light")
 *  2. OS / device preference via prefers-color-scheme
 *
 * This means:
 *  - On first visit the app matches the device setting automatically.
 *  - If the user clicks the toggle, that choice is saved and respected on return visits.
 *  - If the user has never made an explicit choice AND their OS setting changes,
 *    the app updates in real time.
 *  - Calling resetToSystemPreference() clears the saved choice so the OS wins again.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'hc-theme';

type ThemeSource = 'system' | 'user';

interface DarkModeContextValue {
  isDarkMode: boolean;
  themeSource: ThemeSource;       // 'system' | 'user'
  toggleDarkMode: () => void;
  resetToSystemPreference: () => void;
}

const DarkModeContext = createContext<DarkModeContextValue>({
  isDarkMode: false,
  themeSource: 'system',
  toggleDarkMode: () => {},
  resetToSystemPreference: () => {},
});

/* ── helpers ──────────────────────────────────────────────────── */

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getSavedPreference(): boolean | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return null; // nothing saved → defer to OS
}

function applyTheme(dark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark-mode', dark);
}

/* ── provider ─────────────────────────────────────────────────── */

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = getSavedPreference();
    return saved !== null ? saved : getSystemPreference();
  });

  const [themeSource, setThemeSource] = useState<ThemeSource>(() =>
    getSavedPreference() !== null ? 'user' : 'system'
  );

  // Apply class on mount and whenever isDarkMode changes
  useEffect(() => {
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  // Listen for OS preference changes — only act when no user override is saved
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only follow the OS if the user hasn't made an explicit choice
      if (getSavedPreference() === null) {
        setIsDarkMode(e.matches);
        setThemeSource('system');
      }
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Manual toggle: saves user's choice to localStorage
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      setThemeSource('user');
      return next;
    });
  }, []);

  // Clear saved preference and snap back to OS setting
  const resetToSystemPreference = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const systemDark = getSystemPreference();
    setIsDarkMode(systemDark);
    setThemeSource('system');
  }, []);

  return (
    <DarkModeContext.Provider
      value={{ isDarkMode, themeSource, toggleDarkMode, resetToSystemPreference }}
    >
      {children}
    </DarkModeContext.Provider>
  );
}

/* ── hook ─────────────────────────────────────────────────────── */

export function useDarkMode() {
  return useContext(DarkModeContext);
}