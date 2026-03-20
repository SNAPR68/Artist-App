'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Music, Sparkles } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

interface CTABannerProps {
  variant: 'artist' | 'company';
}

const variants = {
  artist: {
    title: 'Are you an artist?',
    subtitle: 'Join thousands of artists getting discovered and booked. No listing fees, instant payments, and a dedicated profile to showcase your talent.',
    cta: 'Create Your Profile',
    ctaHref: '/artist/onboarding',
    gradient: 'from-primary-600 via-secondary-600 to-accent-violet',
    accentColor: 'text-primary-200',
  },
  company: {
    title: 'Manage multiple events?',
    subtitle: 'Run your entertainment business with our workspace — pipeline CRM, branded presentations, team management, and commission tracking.',
    cta: 'Set Up Your Workspace',
    ctaHref: '/login',
    gradient: 'from-amber-600 via-orange-600 to-rose-600',
    accentColor: 'text-amber-200',
  },
};

export function CTABanner({ variant }: CTABannerProps) {
  const config = variants[variant];

  return (
    <section className="py-12 px-6">
      <AnimatedSection>
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-2xl">
          {/* Animated gradient background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${config.gradient} animate-gradient-shift`}
            style={{ backgroundSize: '200% 200%' }}
          />

          {/* Floating decorative elements */}
          <motion.div
            className="absolute top-6 right-12 opacity-20"
            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Music size={60} className="text-white" />
          </motion.div>
          <motion.div
            className="absolute bottom-6 left-12 opacity-15"
            animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <Sparkles size={48} className="text-white" />
          </motion.div>

          {/* Content */}
          <div className="relative z-10 p-10 md:p-16 text-center">
            <h2 className="text-h2 md:text-display font-heading font-bold text-white mb-4">
              {config.title}
            </h2>
            <p className={`text-lg max-w-xl mx-auto mb-8 ${config.accentColor}`}>
              {config.subtitle}
            </p>
            <Link
              href={config.ctaHref}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-surface-bg font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {config.cta}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
