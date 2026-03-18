'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ARTIST_NAV: NavItem[] = [
  { href: '/artist', label: 'Home', icon: '🏠' },
  { href: '/artist/bookings', label: 'Bookings', icon: '📋' },
  { href: '/artist/intelligence', label: 'Intelligence', icon: '🧠' },
  { href: '/artist/financial', label: 'Finances', icon: '💰' },
  { href: '/artist/calendar', label: 'Calendar', icon: '📅' },
];

const CLIENT_NAV: NavItem[] = [
  { href: '/client', label: 'Home', icon: '🏠' },
  { href: '/client/bookings', label: 'Bookings', icon: '📋' },
  { href: '/client/workspace', label: 'Workspace', icon: '🏢' },
  { href: '/client/recommendations', label: 'Discover', icon: '✨' },
  { href: '/search', label: 'Search', icon: '🔍' },
];

const AGENT_NAV: NavItem[] = [
  { href: '/agent', label: 'Home', icon: '🏠' },
  { href: '/agent/roster', label: 'Roster', icon: '🎤' },
  { href: '/agent/bookings', label: 'Bookings', icon: '📋' },
  { href: '/agent/recommendations', label: 'Discover', icon: '✨' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Home', icon: '🏠' },
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
  const { user, logout } = useAuthStore();
  const navItems = getNavItems(user?.role);
  const homeHref = getHomeHref(user?.role);

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
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/voice"
            className="text-gray-500 hover:text-primary-500 transition-colors"
            aria-label="Voice Assistant"
            title="Voice Assistant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="/notifications"
            className="relative text-gray-500 hover:text-gray-700"
            aria-label="Notifications"
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
            Logout
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
