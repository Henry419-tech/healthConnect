'use client';

/**
 * FontStyleContext
 *
 * Accessibility feature — Section 6.2 of the master handoff.
 * Four font families, applied as a class on <html>.
 *
 *   default        (no class)     System UI              — default, no load
 *   font-reading   Georgia, serif                          — longer text, some dyslexia
 *   font-clear     Atkinson Hyperlegible                    — designed for low vision
 *   font-bold      Nunito                                   — rounded, heavier, visible
 *
 * Atkinson Hyperlegible and Nunito are loaded from Google Fonts in layout.tsx.
 * Georgia is system-available; default is system-ui and needs no webfont.
 *
 * HYDRATION SAFETY: identical pattern to FontSizeContext / DarkModeContext —
 * see those files for the full rationale. Starts at the 'default' value
 * (matching the server), reads the real saved preference in a post-hydration
 * useEffect, and relies on a pre-paint <script> in layout.tsx to avoid a flash.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'hc-font-style';

export type FontStyle = 'default' | 'reading' | 'clear' | 'bold';

const DEFAULT_STYLE: FontStyle = 'default';

const CLASS_MAP: Record<FontStyle, string> = {
  default: '',              // system-ui — no class needed
  reading: 'font-reading',
  clear:   'font-clear',
  bold:    'font-bold',
};

const ALL_CLASSES = Object.values(CLASS_MAP).filter(Boolean);

interface FontStyleContextValue {
  fontStyle: FontStyle;
  setFontStyle: (style: FontStyle) => void;
}

const FontStyleContext = createContext<FontStyleContextValue>({
  fontStyle: DEFAULT_STYLE,
  setFontStyle: () => {},
});

/* ── helpers ──────────────────────────────────────────────────── */

function getSavedPreference(): FontStyle | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'default' || saved === 'reading' || saved === 'clear' || saved === 'bold') {
      return saved;
    }
  } catch { /* localStorage blocked (private mode etc.) */ }
  return null;
}

function applyFontStyle(style: FontStyle) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove(...ALL_CLASSES);
  const cls = CLASS_MAP[style];
  if (cls) html.classList.add(cls);
}

/* ── provider ─────────────────────────────────────────────────── */

export function FontStyleProvider({ children }: { children: React.ReactNode }) {
  // ⚠️ MUST start as DEFAULT_STYLE — same value the server renders.
  const [fontStyle, setFontStyleState] = useState<FontStyle>(DEFAULT_STYLE);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    const saved = getSavedPreference();
    const style = saved ?? DEFAULT_STYLE;
    setFontStyleState(style);
    setHydrated(true);
    applyFontStyle(style);
  }, []);

  useEffect(() => {
    if (hydrated) applyFontStyle(fontStyle);
  }, [fontStyle, hydrated]);

  const setFontStyle = useCallback((style: FontStyle) => {
    try { localStorage.setItem(STORAGE_KEY, style); } catch { /* private mode etc. */ }
    setFontStyleState(style);
  }, []);

  return (
    <FontStyleContext.Provider value={{ fontStyle, setFontStyle }}>
      {children}
    </FontStyleContext.Provider>
  );
}

/* ── hook ─────────────────────────────────────────────────────── */

export function useFontStyle() {
  return useContext(FontStyleContext);
}
