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
    <section className="bg-white py-20 px-6">
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
              <div className="flex flex-col items-start p-6 rounded-2xl bg-neutral-50 border border-neutral-100 transition-all duration-300 hover:border-violet-200 hover:shadow-lg h-full">
                {/* Icon Circle */}
                <motion.div
                  className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <stat.icon size={24} className="text-violet-600" />
                </motion.div>

                {/* Stats Value */}
                <div className="mb-2">
                  <p className="text-3xl font-bold text-neutral-900">
                    <CountUpMotion target={stat.value} suffix={stat.suffix} />
                  </p>
                </div>

                {/* Label */}
                <p className="text-sm text-neutral-500 font-medium">{stat.label}</p>

                {/* Animated background glow on hover */}
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-50 to-transparent opacity-0 pointer-events-none"
                  whileHover={{ opacity: 0.5 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
