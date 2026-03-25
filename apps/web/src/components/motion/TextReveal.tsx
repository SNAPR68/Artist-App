'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  wordByWord?: boolean;
}

export const TextReveal = ({
  children,
  className = '',
  delay = 0,
  wordByWord = true,
}: TextRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const words = children.split(' ');

  return (
    <div ref={ref} className={className}>
      {wordByWord ? (
        <span className="inline">
          {words.map((word, index) => (
            <span key={index} className="inline-block mr-[0.25em]">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{
                  duration: 0.5,
                  delay: delay + index * 0.04,
                  ease: 'easeOut',
                }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </span>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{
            duration: 0.5,
            delay,
            ease: 'easeOut',
          }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};
