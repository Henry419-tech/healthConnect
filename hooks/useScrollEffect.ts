
import { useState, useEffect, useCallback } from 'react';

interface UseScrollEffectOptions {
  threshold?: number;
  throttleMs?: number;
}

interface ScrollState {
  isScrolled: boolean;
  scrollY: number;
}

/**
 * Custom hook for handling scroll effects with performance optimization
 * 
 * @param options Configuration options for scroll behavior
 * @returns Object containing scroll state and utility functions
 */
export const useScrollEffect = (options: UseScrollEffectOptions = {}): ScrollState => {
  const { threshold = 50, throttleMs = 16 } = options;
  
  const [scrollState, setScrollState] = useState<ScrollState>({
    isScrolled: false,
    scrollY: 0
  });

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const shouldBeScrolled = scrollTop > threshold;
    
    setScrollState(prev => {
      if (prev.isScrolled !== shouldBeScrolled || prev.scrollY !== scrollTop) {
        return {
          isScrolled: shouldBeScrolled,
          scrollY: scrollTop
        };
      }
      return prev;
    });
  }, [threshold]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const throttledScrollHandler = () => {
      if (timeoutId) return;
      
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, throttleMs);
    };

    // Set initial state
    handleScroll();

    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [handleScroll, throttleMs]);

  return scrollState;
};

export default useScrollEffect;