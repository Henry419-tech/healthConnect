/**
 * useFacilitySearch.ts
 * src/hooks/useFacilitySearch.ts
 *
 * Shared hook: search-bar state + navigation to /facilities?q=<term>.
 * Use this in Dashboard, Emergency, and Profile pages
 * so all top bars behave identically.
 *
 * Usage:
 *   const { searchQuery, setSearchQuery, searchInputRef,
 *           handleSearchSubmit, handleSearchKeyDown } = useFacilitySearch();
 */

'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useFacilitySearch() {
  const router   = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /**
   * On submit:
   *  - Empty query → just focus the input
   *  - On /facilities already → replace URL in-place (no full navigation,
   *    page filters live and dropdown opens via the ?q= mount effect)
   *  - Any other page → push to /facilities?q=<term>
   */
  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      searchInputRef.current?.focus();
      return;
    }
    const target = `/facilities?q=${encodeURIComponent(q)}`;
    if (pathname === '/facilities') {
      router.replace(target, { scroll: false });
    } else {
      router.push(target);
    }
  }, [searchQuery, pathname, router]);

  /** Wire directly to the input's onKeyDown. */
  const handleSearchKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
    if (e.key === 'Escape') {
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  }, [handleSearchSubmit]);

  return {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    handleSearchSubmit,
    handleSearchKeyDown,
  };
}