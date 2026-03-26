'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Calendar, MapPin, Star } from 'lucide-react';
import { CountUpMotion } from '@/components/motion';

const stats = [
  { value: 5000, suffix: '+', label: 'Artists', icon: Users },
  { value: 12000, suffix: '+', label: 'Events', icon: Calendar },
  { value: 50, suffix: '+', label: 'Cities', icon: MapPin },
  { value: 4.9, suffix: '/5', label: 'Rating', icon: Star },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 100,
    },
  },
};

export function StatsBar() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <section className="bg-nocturne-base py-20 px-6">
      <div className="max-w-section mx-auto">
        <motion.div
          ref={containerRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 100,
              }}
              className="group relative"
            >
              <div className="glass-card flex flex-col items-start p-6 rounded-4xl transition-all duration-300 hover:shadow-nocturne-card-hover h-full">
                <motion.div
                  className="w-12 h-12 rounded-xl bg-nocturne-primary-light flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <stat.icon size={24} className="text-nocturne-accent" />
                </motion.div>

                <div className="mb-2">
                  <p className="text-3xl font-bold text-white">
                    <CountUpMotion target={stat.value} suffix={stat.suffix} />
                  </p>
                </div>

                <p className="text-sm text-nocturne-text-secondary font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
