'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  Hero,
  StatsBar,
  Categories,
  HowItWorks,
  FeaturedArtists,
  Testimonials,
  CTABanner,
  TrustSignals,
} from '@/components/landing';

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
    <main className="min-h-screen bg-surface-bg">
      <Navbar />
      <Hero />
      <StatsBar />
      <Categories />
      <HowItWorks />
      <FeaturedArtists />
      <Testimonials />
      <CTABanner variant="artist" />
      <CTABanner variant="company" />
      <TrustSignals />
      <Footer />
    </main>
  );
}
