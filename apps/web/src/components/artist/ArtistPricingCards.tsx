'use client';

import { motion } from 'framer-motion';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

interface PricingEntry {
  event_type: string;
  city_tier: string;
  min_price: number;
  max_price: number;
}

interface ArtistPricingCardsProps {
  pricing: PricingEntry[];
}

export function ArtistPricingCards({ pricing }: ArtistPricingCardsProps) {
  if (!pricing.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-heading font-semibold text-text-primary mb-4">Pricing</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pricing.map((p, i) => (
          <AnimatedSection key={i} delay={i * 0.05}>
            <motion.div
              className="glass-card p-4 relative overflow-hidden"
              whileHover={{ y: -2 }}
            >
              {i === 0 && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-pill bg-gradient-accent text-white text-[9px] font-bold uppercase tracking-wider">
                  Popular
                </span>
              )}
              <p className="text-sm font-semibold text-text-primary mb-1">
                {p.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <p className="text-xs text-text-muted capitalize mb-3">
                {p.city_tier?.replace('_', ' ')}
              </p>
              <p className="text-lg font-heading font-bold text-text-primary">
                ₹{(p.min_price / 100).toLocaleString('en-IN')}
                <span className="text-text-muted font-normal text-sm"> – ₹{(p.max_price / 100).toLocaleString('en-IN')}</span>
              </p>
            </motion.div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}
