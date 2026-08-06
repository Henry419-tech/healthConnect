'use client';

/**
 * FontSizeContext
 *
 * Accessibility feature — Section 6.1 of the master handoff.
 * Four sizes, applied as a class on <html>. All text elsewhere in the app
 * must use rem units so they scale automatically off this root font-size.
 *
 *   (no class)     14px   Small
 *   fs-medium      16px   Medium  — default
 *   fs-large       18px   Large
 *   fs-xl          20px   Extra Large
 *
 * HYDRATION SAFETY: same pattern as DarkModeContext. The lazy initializer
 * does NOT read localStorage at useState() call time — that runs on the
 * client before hydration and would mismatch the server-rendered value.
 * Instead we always start at the 'medium' default (matching what the
 * server renders and what layout.tsx's pre-paint script assumes if nothing
 * is saved yet), then read the real saved preference in a useEffect after
 * hydration completes. The pre-paint <script> in layout.tsx eliminates the
 * flash by applying the class synchronously before first paint.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'hc-font-size';

export type FontSize = 'small' | 'medium' | 'large' | 'xl';

const DEFAULT_SIZE: FontSize = 'medium';

const CLASS_MAP: Record<FontSize, string> = {
  small:  '',           // base <html> rule (14px) — no class needed
  medium: 'fs-medium',
  large:  'fs-large',
  xl:     'fs-xl',
};

const ALL_CLASSES = Object.values(CLASS_MAP).filter(Boolean);

interface FontSizeContextValue {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: DEFAULT_SIZE,
  setFontSize: () => {},
});

/* ── helpers ──────────────────────────────────────────────────── */

function getSavedPreference(): FontSize | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'xl') {
      return saved;
    }
  } catch { /* localStorage blocked (private mode etc.) */ }
  return null;
}

function applyFontSize(size: FontSize) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove(...ALL_CLASSES);
  const cls = CLASS_MAP[size];
  if (cls) html.classList.add(cls);
}

/* ── provider ─────────────────────────────────────────────────── */

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  // ⚠️ MUST start as DEFAULT_SIZE — same value the server renders.
  // Do NOT lazily read localStorage here; that runs at client tick-0
  // before hydration and causes a tree mismatch, same issue DarkModeContext
  // hit and fixed the same way.
  const [fontSize, setFontSizeState] = useState<FontSize>(DEFAULT_SIZE);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // After hydration: read the real saved preference and apply it.
  useEffect(() => {
    const saved = getSavedPreference();
    const size = saved ?? DEFAULT_SIZE;
    setFontSizeState(size);
    setHydrated(true);
    applyFontSize(size);
  }, []);

  // Keep html class in sync on subsequent changes
  useEffect(() => {
    if (hydrated) applyFontSize(fontSize);
  }, [fontSize, hydrated]);

  const setFontSize = useCallback((size: FontSize) => {
    try { localStorage.setItem(STORAGE_KEY, size); } catch { /* private mode etc. */ }
    setFontSizeState(size);
  }, []);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

/* ── hook ─────────────────────────────────────────────────────── */

export function useFontSize() {
  return useContext(FontSizeContext);
}
