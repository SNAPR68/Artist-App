'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

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
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    gradient: 'from-primary-900/95 via-primary-900/80 to-primary-900/40',
    accentColor: 'from-primary-500 to-primary-600',
  },
  company: {
    title: 'Run events at scale?',
    subtitle: 'Workspace CRM, team management, and commission tracking.',
    cta: 'Set Up Workspace',
    ctaHref: '/login',
    badge: '10,000+ Events',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    gradient: 'from-secondary-900/95 via-secondary-900/80 to-secondary-900/40',
    accentColor: 'from-secondary-500 to-secondary-600',
  },
};

export function CTABanner({ variant }: CTABannerProps) {
  const config = variants[variant];

  return (
    <section className="py-8 md:py-12 px-6">
      <div className="max-w-section mx-auto">
        <div className="relative overflow-hidden rounded-3xl h-[280px] md:h-[320px] group">
          {/* Background image with parallax effect */}
          <img
            src={config.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient}`} />

          {/* Decorative floating elements */}
          <div className="absolute top-8 right-12 w-24 h-24 rounded-full bg-gradient-to-br from-accent-magenta/20 to-accent-pink/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-6 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary-500/15 to-secondary-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Animated dots pattern */}
          <div className="absolute top-6 right-6 space-y-3 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Glass card overlay on the right side */}
          <div className="absolute inset-y-0 right-0 w-full md:w-5/12 bg-gradient-to-l from-glass-medium via-glass-medium/50 to-transparent border-l border-glass-border/30 flex items-center justify-end" />

          {/* Content - positioned on left, visible over glass overlay */}
          <div className="relative z-20 h-full flex flex-col justify-center px-6 md:px-10 max-w-md">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-glass-medium border border-glass-border/50 w-fit mb-4 text-xs font-semibold text-white/80">
              <Sparkles size={14} />
              {config.badge}
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-3 leading-tight">
              {config.title}
            </h2>

            {/* Subtitle */}
            <p className="text-sm md:text-base text-white/80 mb-6 leading-relaxed">
              {config.subtitle}
            </p>

            {/* CTA Button with glow */}
            <Link
              href={config.ctaHref}
              className={`group/btn inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${config.accentColor} hover:shadow-glow-sm text-white font-semibold text-sm rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] w-fit relative overflow-hidden`}
            >
              {/* Button glow background */}
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-white transition-opacity duration-300" />

              <span className="relative flex items-center gap-2">
                {config.cta}
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
