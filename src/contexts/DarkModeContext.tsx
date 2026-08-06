'use client';

/**
 * DarkModeContext
 *
 * Priority order:
 *  1. User's explicit choice (stored in localStorage as "hc-theme": "dark" | "light")
 *  2. OS / device preference via prefers-color-scheme
 *
 * HYDRATION SAFETY: The lazy initializer previously read localStorage/matchMedia
 * at useState() call time, which runs on the client BEFORE hydration completes.
 * This caused isDarkMode to differ between server (always false) and client
 * (real preference) → React hydration mismatch cascade across the entire app.
 *
 * Fix: Always start with false (matching server), then read the real preference
 * in a useEffect (post-hydration). The brief flash is eliminated by the inline
 * script in layout.tsx which applies the class synchronously before first paint.
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
  themeSource: ThemeSource;
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
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch { /* localStorage blocked (private mode etc.) */ }
  return null;
}

function applyTheme(dark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark-mode', dark);
}

/* ── provider ─────────────────────────────────────────────────── */

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  // ⚠️ MUST start as false — same value the server renders.
  // Do NOT use a lazy initializer that reads localStorage/matchMedia here:
  // that runs at client tick-0 before hydration and causes a tree mismatch.
  const [isDarkMode,   setIsDarkMode]   = useState<boolean>(false);
  const [themeSource,  setThemeSource]  = useState<ThemeSource>('system');
  const [hydrated,     setHydrated]     = useState<boolean>(false);

  // After hydration: read real preference and apply it.
  // This is the ONLY place we read localStorage/matchMedia.
  useEffect(() => {
    const saved  = getSavedPreference();
    const system = getSystemPreference();
    const dark   = saved !== null ? saved : system;
    const src: ThemeSource = saved !== null ? 'user' : 'system';

    setIsDarkMode(dark);
    setThemeSource(src);
    setHydrated(true);
    applyTheme(dark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep html class in sync on subsequent changes
  useEffect(() => {
    if (hydrated) applyTheme(isDarkMode);
  }, [isDarkMode, hydrated]);

  // Listen for OS preference changes — only act when no user override is saved
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (getSavedPreference() === null) {
        setIsDarkMode(e.matches);
        setThemeSource('system');
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch {}
      setThemeSource('user');
      return next;
    });
  }, []);

  const resetToSystemPreference = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
