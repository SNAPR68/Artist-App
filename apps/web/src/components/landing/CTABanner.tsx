'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface CTABannerProps {
  variant: 'artist' | 'company';
}

const variants = {
  artist: {
    title: 'Are you an artist?',
    subtitle: 'Join 5,000+ artists getting discovered and booked. Zero listing fees.',
    cta: 'Create Your Profile',
    ctaHref: '/artist/onboarding',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    gradient: 'from-primary-900/90 via-primary-900/70 to-transparent',
  },
  company: {
    title: 'Run events at scale?',
    subtitle: 'Workspace CRM, team management, and commission tracking.',
    cta: 'Set Up Workspace',
    ctaHref: '/login',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    gradient: 'from-surface-bg/95 via-surface-bg/70 to-transparent',
  },
};

export function CTABanner({ variant }: CTABannerProps) {
  const config = variants[variant];

  return (
    <section className="py-6 px-6">
      <div className="max-w-section mx-auto">
        <div className="relative overflow-hidden rounded-2xl h-[200px] md:h-[220px]">
          {/* Background image */}
          <img
            src={config.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient}`} />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-12 max-w-md">
            <h2 className="text-xl md:text-2xl font-heading font-bold text-white mb-2">
              {config.title}
            </h2>
            <p className="text-sm text-white/70 mb-5 leading-relaxed">
              {config.subtitle}
            </p>
            <Link
              href={config.ctaHref}
              className="group inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-100 text-surface-bg font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] w-fit"
            >
              {config.cta}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
