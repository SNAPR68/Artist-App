'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/auth';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { VoiceAssistant } from '../voice/VoiceAssistant';

interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
}

const ARTIST_NAV: NavItem[] = [
  { href: '/artist', labelKey: 'nav.home', icon: '🏠' },
  { href: '/artist/bookings', labelKey: 'nav.bookings', icon: '📋' },
  { href: '/gigs', labelKey: 'nav.gigs', icon: '🎯' },
  { href: '/artist/intelligence', labelKey: 'nav.intelligence', icon: '🧠' },
  { href: '/artist/financial', labelKey: 'nav.finances', icon: '💰' },
  { href: '/artist/calendar', labelKey: 'nav.calendar', icon: '📅' },
];

const CLIENT_NAV: NavItem[] = [
  { href: '/client', labelKey: 'nav.home', icon: '🏠' },
  { href: '/client/bookings', labelKey: 'nav.bookings', icon: '📋' },
  { href: '/gigs', labelKey: 'nav.gigs', icon: '🎯' },
  { href: '/client/workspace', labelKey: 'nav.workspace', icon: '🏢' },
  { href: '/client/recommendations', labelKey: 'nav.discover', icon: '✨' },
  { href: '/search', labelKey: 'nav.search', icon: '🔍' },
];

const AGENT_NAV: NavItem[] = [
  { href: '/agent', labelKey: 'nav.home', icon: '🏠' },
  { href: '/agent/roster', labelKey: 'nav.roster', icon: '🎤' },
  { href: '/agent/bookings', labelKey: 'nav.bookings', icon: '📋' },
  { href: '/gigs', labelKey: 'nav.gigs', icon: '🎯' },
  { href: '/agent/recommendations', labelKey: 'nav.discover', icon: '✨' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', labelKey: 'nav.home', icon: '🏠' },
];

function getNavItems(role?: string): NavItem[] {
  switch (role) {
    case 'artist': return ARTIST_NAV;
    case 'client':
    case 'event_company': return CLIENT_NAV;
    case 'agent': return AGENT_NAV;
    case 'admin': return ADMIN_NAV;
    default: return ARTIST_NAV;
  }
}

function getHomeHref(role?: string): string {
  switch (role) {
    case 'artist': return '/artist';
    case 'client':
    case 'event_company': return '/client';
    case 'agent': return '/agent';
    case 'admin': return '/admin';
    default: return '/';
  }
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, _initialized, initialize, logout } = useAuthStore();
  const { t } = useI18n();
  const navItems = getNavItems(user?.role);
  const homeHref = getHomeHref(user?.role);
  const [mounted, setMounted] = useState(false);

  // Ensure auth is initialized on client
  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  // Auth guard: redirect to login if not authenticated after client mount
  useEffect(() => {
    if (mounted && _initialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, _initialized, isAuthenticated, router]);

  // Show loading until client-side auth check is done
  if (!mounted || !_initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-0">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href={homeHref} className="text-xl font-bold text-primary-500">
          ArtistBooking
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/notifications"
            className="relative text-gray-500 hover:text-gray-700"
            aria-label={t('nav.notifications')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </Link>
          <span className="text-sm text-gray-600 hidden sm:inline">{user?.phone}</span>
          <button
            onClick={() => logout()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('nav.logout')}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 sm:hidden z-40">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs ${
                isActive ? 'text-primary-500' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Floating Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
}
