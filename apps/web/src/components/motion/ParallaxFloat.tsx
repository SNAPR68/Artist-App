'use client';

import { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

type Direction = 'up' | 'down';

interface ParallaxFloatProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: Direction;
}

export const ParallaxFloat = ({
  children,
  className = '',
  speed = 0.2,
  direction = 'up',
}: ParallaxFloatProps) => {
  const { scrollY } = useScroll();

  const y = useTransform(
    scrollY,
    [0, 1000],
    [0, direction === 'up' ? -100 * speed : 100 * speed]
  );

  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
};
