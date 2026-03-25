'use client';

import { ReactNode, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltAmount?: number;
}

export const TiltCard = ({
  children,
  className = '',
  tiltAmount = 8,
}: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springRotateX = useSpring(rotateX, {
    stiffness: 300,
    damping: 30,
    mass: 0.2,
  });

  const springRotateY = useSpring(rotateY, {
    stiffness: 300,
    damping: 30,
    mass: 0.2,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !isHovered) return;

    const { width, height, top, left } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const relativeX = e.clientX - centerX;
    const relativeY = e.clientY - centerY;

    const maxX = width / 2;
    const maxY = height / 2;

    const percentX = relativeX / maxX;
    const percentY = relativeY / maxY;

    rotateY.set(percentX * tiltAmount);
    rotateX.set(-percentY * tiltAmount);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      style={{
        perspective: '1000px',
      }}
    >
      <motion.div
        ref={ref}
        className={className}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
