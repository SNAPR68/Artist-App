'use client';

import { motion } from 'framer-motion';

interface FloatingBlobProps {
  color?: string;
  size?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
}

export function FloatingBlob({
  color = 'rgba(99, 102, 241, 0.15)',
  size = 300,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: FloatingBlobProps) {
  return (
    <motion.div
      className="absolute animate-blob pointer-events-none"
      style={{
        width: size,
        height: size,
        background: color,
        filter: `blur(${size * 0.3}px)`,
        top,
        left,
        right,
        bottom,
      }}
      animate={{ scale: [1, 1.1, 0.95, 1] }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}
