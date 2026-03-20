'use client';

import { useState, useEffect } from 'react';

interface ScrollState {
  scrollDirection: 'up' | 'down';
  scrollY: number;
  isAtTop: boolean;
}

export function useScrollDirection(threshold = 10): ScrollState {
  const [state, setState] = useState<ScrollState>({
    scrollDirection: 'up',
    scrollY: 0,
    isAtTop: true,
  });

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScroll = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';

      if (Math.abs(scrollY - lastScrollY) >= threshold) {
        setState({
          scrollDirection: direction,
          scrollY,
          isAtTop: scrollY < 10,
        });
        lastScrollY = scrollY;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return state;
}
