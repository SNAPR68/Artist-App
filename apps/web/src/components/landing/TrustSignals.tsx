'use client';

import { Shield, BadgeCheck, Clock, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const signals = [
  {
    icon: Shield,
    label: 'Escrow Protection',
  },
  {
    icon: BadgeCheck,
    label: 'Verified Artists',
  },
  {
    icon: Clock,
    label: 'Book in 24hrs',
  },
  {
    icon: CreditCard,
    label: 'Secure Payments',
  },
];

const TrustBadge = ({ signal, index }: { signal: typeof signals[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    transition={{
      duration: 0.5,
      delay: index * 0.1,
      ease: 'easeOut',
    }}
    viewport={{ once: true, amount: 0.5 }}
    whileHover={{
      scale: 1.05,
      boxShadow: '0 0 30px -5px rgba(138, 43, 226, 0.3)',
    }}
    className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card hover:shadow-nocturne-glow-sm transition-all duration-300"
  >
    <motion.div
      animate={{ y: [0, -2, 0] }}
      transition={{
        duration: 2.5,
        delay: index * 0.2,
        repeat: Infinity,
      }}
    >
      <signal.icon size={18} className="text-nocturne-accent shrink-0" />
    </motion.div>

    <span className="text-sm font-medium text-nocturne-text-secondary whitespace-nowrap">
      {signal.label}
    </span>
  </motion.div>
);

export function TrustSignals() {
  return (
    <section className="py-16 px-6 bg-nocturne-surface">
      <div className="max-w-section mx-auto">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="flex flex-wrap justify-center gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {signals.map((signal, index) => (
              <TrustBadge key={signal.label} signal={signal} index={index} />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
