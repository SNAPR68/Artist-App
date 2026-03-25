'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/landing/Hero';

// Lazy-load below-the-fold components to prevent webpack compilation hang
const ScrollProgress = dynamic(() => import('@/components/motion/ScrollProgress').then(m => ({ default: m.ScrollProgress })), { ssr: false });
const StatsBar = dynamic(() => import('@/components/landing/StatsBar').then(m => ({ default: m.StatsBar })), { ssr: false });
const Categories = dynamic(() => import('@/components/landing/Categories').then(m => ({ default: m.Categories })), { ssr: false });
const FeaturedArtists = dynamic(() => import('@/components/landing/FeaturedArtists').then(m => ({ default: m.FeaturedArtists })), { ssr: false });
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })), { ssr: false });
const Testimonials = dynamic(() => import('@/components/landing/Testimonials').then(m => ({ default: m.Testimonials })), { ssr: false });
const CTABanner = dynamic(() => import('@/components/landing/CTABanner').then(m => ({ default: m.CTABanner })), { ssr: false });
const TrustSignals = dynamic(() => import('@/components/landing/TrustSignals').then(m => ({ default: m.TrustSignals })), { ssr: false });
const Footer = dynamic(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })), { ssr: false });

function getDashboardHref(role?: string): string {
  switch (role) {
    case 'artist': return '/artist';
    case 'client':
    case 'event_company': return '/client';
    case 'agent': return '/agent';
    case 'admin': return '/admin';
    default: return '/';
  }
}

export default function HomePage() {
  const { user, isAuthenticated, _initialized } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Authenticated users: redirect to their dashboard
  useEffect(() => {
    if (mounted && _initialized && isAuthenticated && user) {
      router.replace(getDashboardHref(user.role));
    }
  }, [mounted, _initialized, isAuthenticated, user, router]);

  return (
    <main className="min-h-screen bg-white">
      <ScrollProgress />
      <Navbar />
      <Hero />
      <StatsBar />
      <Categories />
      <FeaturedArtists />
      <CTABanner variant="artist" />
      <HowItWorks />
      <Testimonials />
      <CTABanner variant="company" />
      <TrustSignals />
      <Footer />
    </main>
  );
}
