/**
 * useFacilitySearch.ts
 * src/hooks/useFacilitySearch.ts
 *
 * Shared hook: search-bar state + navigation to /facilities?q=<term>.
 * Use this in Dashboard, Symptom Checker, Emergency, and Profile pages
 * so all top bars behave identically.
 *
 * Usage:
 *   const { searchQuery, setSearchQuery, searchInputRef,
 *           handleSearchSubmit, handleSearchKeyDown } = useFacilitySearch();
 */

'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

export function useFacilitySearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /** Navigate to /facilities with the typed query pre-filled. */
  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      searchInputRef.current?.focus();
      return;
    }
    router.push(`/facilities?q=${encodeURIComponent(q)}`);
  }, [searchQuery, router]);

  /** Wire directly to the input's onKeyDown. */
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearchSubmit();
  };

  return {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    handleSearchSubmit,
    handleSearchKeyDown,
  };
}