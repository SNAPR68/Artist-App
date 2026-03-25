'use client';

import { ReactNode, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
  href?: string;
  [key: string]: unknown;
}

export const MagneticButton = ({
  children,
  className = '',
  as = 'button',
  ...rest
}: MagneticButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, {
    mass: 1,
    stiffness: 150,
    damping: 12,
  });

  const ySpring = useSpring(y, {
    mass: 1,
    stiffness: 150,
    damping: 12,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !isHovered) return;

    const { width, height, top, left } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distance = 50;
    const maxDisplacement = 6;

    const distanceFromCenter = Math.hypot(
      e.clientX - centerX,
      e.clientY - centerY
    );

    if (distanceFromCenter < distance) {
      x.set(
        (e.clientX - centerX) * 0.2 * Math.min(maxDisplacement / distance, 1)
      );
      y.set(
        (e.clientY - centerY) * 0.2 * Math.min(maxDisplacement / distance, 1)
      );
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const Tag = as as React.ElementType;

  return (
    <motion.div
      ref={ref}
      style={{ x: xSpring, y: ySpring }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      <Tag {...rest}>{children}</Tag>
    </motion.div>
  );
};
