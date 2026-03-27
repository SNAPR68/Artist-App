'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/landing/Hero';

// Lazy-load below-the-fold components
const Categories = dynamic(() => import('@/components/landing/Categories').then(m => ({ default: m.Categories })), { ssr: false });
const FeaturedArtists = dynamic(() => import('@/components/landing/FeaturedArtists').then(m => ({ default: m.FeaturedArtists })), { ssr: false });
const InstaBookBanner = dynamic(() => import('@/components/landing/InstaBookBanner').then(m => ({ default: m.InstaBookBanner })), { ssr: false });
const CTABanner = dynamic(() => import('@/components/landing/CTABanner').then(m => ({ default: m.CTABanner })), { ssr: false });
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

  useEffect(() => {
    if (mounted && _initialized && isAuthenticated && user) {
      router.replace(getDashboardHref(user.role));
    }
  }, [mounted, _initialized, isAuthenticated, user, router]);

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white font-sans">
      <Navbar />
      <Hero />
      <Categories />
      <FeaturedArtists />
      <InstaBookBanner />
      <CTABanner />
      <Footer />
    </main>
  );
}
