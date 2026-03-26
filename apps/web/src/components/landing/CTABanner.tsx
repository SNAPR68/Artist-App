'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/motion/FadeIn';

interface CTABannerProps {
  variant: 'artist' | 'company';
}

const variants = {
  artist: {
    title: 'Are you an artist?',
    subtitle: 'Join 5,000+ artists getting discovered and booked. Zero listing fees.',
    cta: 'Create Your Profile',
    ctaHref: '/artist/onboarding',
    badge: '5,000+ Artists',
    bgGradient: 'from-nocturne-primary via-purple-700 to-nocturne-primary-hover',
    buttonBg: 'bg-white',
    buttonText: 'text-nocturne-primary-hover',
  },
  company: {
    title: 'Run events at scale?',
    subtitle: 'Workspace CRM, team management, and commission tracking.',
    cta: 'Set Up Workspace',
    ctaHref: '/login',
    badge: '10,000+ Events',
    bgGradient: 'from-nocturne-surface-2 via-nocturne-surface to-nocturne-surface-2',
    buttonBg: 'bg-gradient-nocturne hover:shadow-nocturne-glow-purple',
    buttonText: 'text-white',
  },
};

const FloatingCircle = ({ delay, size, className }: { delay: number; size: string; className: string }) => (
  <motion.div
    className={`absolute rounded-full opacity-10 ${className} ${size}`}
    animate={{
      y: [0, -20, 0],
      x: [0, 10, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

export function CTABanner({ variant }: CTABannerProps) {
  const config = variants[variant];
  const isArtist = variant === 'artist';

  return (
    <section className="py-8 md:py-12 px-6">
      <div className="max-w-section mx-auto">
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.3 }}
          className={`bg-gradient-to-br ${config.bgGradient} rounded-4xl overflow-hidden py-16 px-8 md:px-12 text-white relative border border-white/[0.08]`}
        >
          {isArtist && (
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="2"/%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)"%3E%3C/rect%3E%3C/svg%3E")',
              }}
              animate={{ opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}

          <FloatingCircle delay={0} size="w-40 h-40" className="top-0 right-0 bg-nocturne-accent" />
          <FloatingCircle delay={1} size="w-32 h-32" className="bottom-10 left-10 bg-nocturne-primary" />
          <FloatingCircle delay={0.5} size="w-24 h-24" className="top-1/3 left-1/4 bg-nocturne-violet" />

          <div className="max-w-xl relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.15] w-fit mb-4 text-[11px] font-semibold text-nocturne-accent/80"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity }}>
                <Sparkles size={12} />
              </motion.div>
              {config.badge}
            </motion.div>

            <FadeIn direction="up" delay={0.2} duration={0.7}>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 leading-tight">
                {config.title}
              </h2>
            </FadeIn>

            <FadeIn direction="up" delay={0.3} duration={0.7}>
              <p className="text-[15px] text-white/70 mb-8 leading-relaxed max-w-sm">
                {config.subtitle}
              </p>
            </FadeIn>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Link
                href={config.ctaHref}
                className={`inline-flex items-center gap-2 px-6 py-3 ${config.buttonBg} ${config.buttonText} font-semibold text-sm rounded-xl shadow-md transition-all duration-300 active:scale-[0.97]`}
              >
                <motion.span whileHover={{ x: 0 }} className="relative">
                  {config.cta}
                </motion.span>
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  whileHover={{ x: 4 }}
                >
                  <ArrowRight size={16} />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.section>
      </div>
    </section>
  );
}
