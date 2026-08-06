'use client';

/**
 * LanguageContext + useTranslation hook
 *
 * Priority order for logged-in users:
 *  1. User's saved preference on server (synced via syncServerLanguage after session loads)
 *  2. localStorage ('hc-language')
 *  3. Default: 'en'
 *
 * HYDRATION SAFETY: Mirrors DarkModeContext pattern exactly.
 * - Always start with 'en' (matching server render).
 * - Read the real preference in a useEffect (post-hydration).
 * - A brief flash is acceptable; there is no pre-paint script needed
 *   for language the way there is for dark mode, since the server
 *   always renders English and mismatches would still cause hydration
 *   errors — so we accept the one-tick swap.
 *
 * KEY LOOKUP: t('a.b.c') traverses the JSON tree by dot notation.
 * Falls back to English if the key is missing in Twi.
 * Falls back to the provided fallback string (or the key itself) if
 * missing from English too — never shows a raw key in the UI.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import enMessages from '@/lib/i18n/en.json';
import twMessages from '@/lib/i18n/tw.json';

/* ── Types ────────────────────────────────────────────────────── */

export type Language = 'en' | 'tw';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Sync a language value that came from the server (e.g. session). */
  syncServerLanguage: (lang: Language) => void;
}

/* ── Helpers ──────────────────────────────────────────────────── */

const STORAGE_KEY = 'hc-language';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MESSAGES: Record<Language, Record<string, any>> = {
  en: enMessages,
  tw: twMessages,
};

function getSavedLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'tw') return saved;
  } catch { /* localStorage blocked (private mode etc.) */ }
  return null;
}

function saveLanguage(lang: Language) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
}

/**
 * Traverse a nested JSON object by dot-notation key.
 * Returns the value (string or nested object) or undefined.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: Record<string, any>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/* ── Context ──────────────────────────────────────────────────── */

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  syncServerLanguage: () => {},
});

/* ── Provider ─────────────────────────────────────────────────── */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // ⚠️ MUST start as 'en' — same value the server renders.
  const [language, setLanguageState] = useState<Language>('en');

  // After hydration: read real preference from localStorage.
  useEffect(() => {
    const saved = getSavedLanguage();
    if (saved) setLanguageState(saved);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  // Called by pages/components that know the server preference
  // (e.g. after session loads and reveals user.language).
  // Server value wins over localStorage for logged-in users.
  const syncServerLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, syncServerLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ── useTranslation hook ──────────────────────────────────────── */

/**
 * Returns a `t(key, fallback?)` function.
 *
 * - key: dot-separated path, e.g. 'nav.home', 'emergency.guides.cpr.title'
 * - fallback: returned if the key is missing in both the active language
 *   and English. Defaults to the key itself so you always see something.
 *
 * Lookup order:
 *   1. Active language JSON
 *   2. English JSON (if active lang is Twi and key is missing)
 *   3. fallback string
 *   4. key itself
 */
export function useTranslation() {
  const { language } = useContext(LanguageContext);

  const t = useCallback((key: string, fallback?: string): string => {
    const activeMessages = MESSAGES[language];
    const enFallback     = MESSAGES['en'];

    // Try active language first
    const activeValue = getNestedValue(activeMessages, key);
    if (typeof activeValue === 'string') return activeValue;

    // Fall back to English
    if (language !== 'en') {
      const enValue = getNestedValue(enFallback, key);
      if (typeof enValue === 'string') return enValue;
    }

    // Final fallbacks
    return fallback ?? key;
  }, [language]);

  return { t, language };
}

/**
 * Access to the full context (language + setters) for controls
 * like the language toggle in Settings.
 */
export function useLanguage() {
  return useContext(LanguageContext);
}