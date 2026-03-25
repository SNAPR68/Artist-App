'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  duration?: number;
  once?: boolean;
  amount?: number;
}

export const FadeIn = ({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.6,
  once = true,
  amount = 0.3,
}: FadeInProps) => {
  const getInitialValues = () => {
    const offset = 30;
    switch (direction) {
      case 'up':
        return { opacity: 0, y: offset };
      case 'down':
        return { opacity: 0, y: -offset };
      case 'left':
        return { opacity: 0, x: offset };
      case 'right':
        return { opacity: 0, x: -offset };
      case 'none':
        return { opacity: 0 };
      default:
        return { opacity: 0, y: offset };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitialValues()}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
};
