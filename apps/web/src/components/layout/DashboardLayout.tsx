'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/auth';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useUnreadCount } from '@/lib/notifications-poll';
import {
  Home,
  Calendar,
  Target,
  Brain,
  Wallet,
  CalendarDays,
  Users,
  Building2,
  Sparkles,
  Kanban,
  Link2,
  ShieldCheck,
  FileText,
  Receipt,
  BarChart3,
  Zap,
  CreditCard,
  Search,
  Bell,
  LogOut,
  Sparkle,
} from 'lucide-react';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const ARTIST_NAV: NavItem[] = [
  { href: '/artist', labelKey: 'nav.home', icon: <Home size={18} /> },
  { href: '/artist/bookings', labelKey: 'nav.bookings', icon: <Calendar size={18} /> },
  { href: '/gigs', labelKey: 'nav.gigs', icon: <Target size={18} /> },
  { href: '/artist/intelligence', labelKey: 'nav.intelligence', icon: <Brain size={18} /> },
  { href: '/artist/financial', labelKey: 'nav.finances', icon: <Wallet size={18} /> },
  { href: '/artist/calendar', labelKey: 'nav.calendar', icon: <CalendarDays size={18} /> },
  { href: '/artist/reputation', labelKey: 'nav.reputation', icon: <ShieldCheck size={18} /> },
  { href: '/artist/earnings/tds', labelKey: 'nav.tds', icon: <FileText size={18} /> },
  { href: '/artist/epk', labelKey: 'nav.epk', icon: <Sparkle size={18} /> },
  { href: '/artist/settings/integrations', labelKey: 'nav.integrations', icon: <Link2 size={18} /> },
];

const CLIENT_NAV: NavItem[] = [
  { href: '/client', labelKey: 'nav.home', icon: <Home size={18} /> },
  { href: '/client/bookings', labelKey: 'nav.bookings', icon: <Calendar size={18} /> },
  { href: '/gigs', labelKey: 'nav.gigs', icon: <Target size={18} /> },
  { href: '/client/workspace', labelKey: 'nav.workspace', icon: <Building2 size={18} /> },
  { href: '/client/recommendations', labelKey: 'nav.discover', icon: <Sparkles size={18} /> },
  { href: '/search', labelKey: 'nav.search', icon: <Search size={18} /> },
];

const AGENT_NAV: NavItem[] = [
  { href: '/agent', labelKey: 'nav.home', icon: <Home size={18} /> },
  { href: '/agent/roster', labelKey: 'nav.roster', icon: <Users size={18} /> },
  { href: '/agent/bookings', labelKey: 'nav.bookings', icon: <Calendar size={18} /> },
  { href: '/gigs', labelKey: 'nav.gigs', icon: <Target size={18} /> },
  { href: '/agent/recommendations', labelKey: 'nav.discover', icon: <Sparkles size={18} /> },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', labelKey: 'nav.home', icon: <Home size={18} /> },
  { href: '/admin/analytics', labelKey: 'nav.analytics', icon: <BarChart3 size={18} /> },
  { href: '/admin/concierge', labelKey: 'nav.concierge', icon: <Sparkles size={18} /> },
  { href: '/admin/instabook', labelKey: 'nav.instabook', icon: <Zap size={18} /> },
];

const EVENT_COMPANY_NAV: NavItem[] = [
  { href: '/event-company', labelKey: 'nav.home', icon: <Home size={18} /> },
  { href: '/event-company/deals', labelKey: 'nav.deals', icon: <Kanban size={18} /> },
  { href: '/client/bookings', labelKey: 'nav.bookings', icon: <Calendar size={18} /> },
  { href: '/gigs', labelKey: 'nav.gigs', icon: <Target size={18} /> },
  { href: '/client/workspace', labelKey: 'nav.workspace', icon: <Building2 size={18} /> },
  { href: '/event-company/team', labelKey: 'nav.team', icon: <Users size={18} /> },
  { href: '/event-company/templates', labelKey: 'nav.templates', icon: <FileText size={18} /> },
  { href: '/event-company/invoices', labelKey: 'nav.invoices', icon: <Receipt size={18} /> },
  { href: '/event-company/billing', labelKey: 'nav.billing', icon: <CreditCard size={18} /> },
  { href: '/client/recommendations', labelKey: 'nav.discover', icon: <Sparkles size={18} /> },
  { href: '/search', labelKey: 'nav.search', icon: <Search size={18} /> },
];

function getNavItems(role?: string): NavItem[] {
  switch (role) {
    case 'artist': return ARTIST_NAV;
    case 'event_company': return EVENT_COMPANY_NAV;
    case 'client': return CLIENT_NAV;
    case 'agent': return AGENT_NAV;
    case 'admin': return ADMIN_NAV;
    default: return ARTIST_NAV;
  }
}

function getHomeHref(role?: string): string {
  switch (role) {
    case 'artist': return '/artist';
    case 'event_company': return '/event-company';
    case 'client': return '/client';
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
  const { unreadCount } = useUnreadCount();
  const navItems = getNavItems(user?.role);
  const homeHref = getHomeHref(user?.role);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (_initialized && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`);
    }
  }, [_initialized, isAuthenticated, pathname, router]);

  if (!_initialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-nocturne-base flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-5 h-5 border-2 border-[#c39bff] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  const initials = user?.phone
    ? user.phone.slice(-2).toUpperCase()
    : 'U';

  return (
    <div className="theme-nocturne min-h-screen bg-nocturne-base text-white pb-20 sm:pb-0">
      {/* Desktop Top Bar */}
      <header className="hidden sm:flex sticky top-0 z-navbar items-center justify-between px-6 h-14 bg-white/5 backdrop-blur-3xl border-b border-white/10 shadow-sm">
        {/* Logo */}
        <Link
          href={homeHref}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-6 h-6 rounded-md bg-[#c39bff] flex items-center justify-center">
            <Sparkle size={16} className="text-white" />
          </div>
          <span className="text-sm font-display font-bold text-[#c39bff] hidden lg:block">ArtistBook</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="flex items-center gap-0.5 flex-1 mx-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/30'
                    : 'text-white/50 hover:text-white/70 border border-transparent hover:bg-white/5'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="hidden lg:inline">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Notification Bell */}
          <Link
            href="/notifications"
            className="relative text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 min-h-11 min-w-11 flex items-center justify-center"
            aria-label={t('nav.notifications')}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold leading-none text-white bg-[#c39bff] rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <LanguageSwitcher />

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-2" />

          {/* User Avatar */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all cursor-default min-h-11">
            <div className="w-8 h-8 rounded-full bg-[#c39bff] flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
              {initials}
            </div>
            <div className="hidden xl:flex flex-col min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{user?.phone || 'User'}</p>
              <p className="text-[10px] text-white/50 capitalize">{user?.role}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all min-h-11 min-w-11 flex items-center justify-center"
            title={t('nav.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sm:hidden sticky top-0 z-navbar px-4 py-3 bg-white/5 backdrop-blur-3xl border-b border-white/10 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href={homeHref} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#c39bff] flex items-center justify-center">
              <Sparkle size={16} className="text-white" />
            </div>
          </Link>

          <div className="flex items-center gap-0.5">
            <Link
              href="/notifications"
              className="relative text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 min-h-11 min-w-11 flex items-center justify-center"
              aria-label={t('nav.notifications')}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold leading-none text-white bg-[#c39bff] rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <LanguageSwitcher />

            <button
              onClick={() => logout()}
              className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all min-h-11 min-w-11 flex items-center justify-center"
              title={t('nav.logout')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation — Mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-3xl border-t border-white/10 z-navbar shadow-sm">
        <div className="flex justify-around items-stretch">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-3 flex-1 transition-all duration-200 relative min-h-[3.5rem] ${
                  isActive ? 'text-[#c39bff]' : 'text-white/50 hover:text-white'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-[10px] font-medium whitespace-nowrap">{t(item.labelKey)}</span>
                {isActive && (
                  <div className="absolute -top-1 w-1 h-1 bg-[#c39bff] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
