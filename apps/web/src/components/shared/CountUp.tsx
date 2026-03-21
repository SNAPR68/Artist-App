'use client';

import { useRef, useEffect, useState } from 'react';

interface CountUpProps {
  end: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({ end, duration = 2, prefix = '', suffix = '', className = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(`${prefix}0${suffix}`);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const el = ref.current;
    if (!el) return;

    const startAnimation = () => {
      setHasAnimated(true);

      // If end is a string like "<24hrs", just display it directly
      if (typeof end === 'string') {
        setDisplay(end);
        return;
      }

      const startTime = performance.now();
      const endValue = end;

      const animate = (currentTime: number) => {
        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * endValue);

        setDisplay(`${prefix}${current.toLocaleString('en-IN')}${suffix}`);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    };

    // Check if already in viewport (handles elements visible on mount)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          startAnimation();
        }
      },
      { threshold: 0 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [hasAnimated, end, duration, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
