'use client';

import { useRef, useState, useEffect } from 'react';
import { useInView, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion';

interface CountUpMotionProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUpMotion = ({
  target,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpMotionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(0);

  const count = useMotionValue(0);
  const springValue = useSpring(count, {
    mass: 1,
    stiffness: 75,
    damping: 15,
  });

  useMotionValueEvent(springValue, 'change', (latest) => {
    setDisplayValue(Math.round(latest));
  });

  useEffect(() => {
    if (isInView) {
      count.set(target);
    }
  }, [isInView, target, count]);

  return (
    <div ref={ref} className={className}>
      <span>
        {prefix}
        {displayValue.toLocaleString()}
        {suffix}
      </span>
    </div>
  );
};
