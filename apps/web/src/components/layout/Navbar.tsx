'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Search, Mic, ChevronRight, Building2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { useScrollDirection } from '@/hooks/useScrollDirection';

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

export function Navbar() {
  const { user, isAuthenticated, _initialized, logout } = useAuthStore();
  const { scrollDirection, isAtTop } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Handle drawer open/close with CSS transition
  useEffect(() => {
    if (mobileOpen) {
      requestAnimationFrame(() => setDrawerVisible(true));
    } else {
      setDrawerVisible(false);
    }
  }, [mobileOpen]);

  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    // Wait for transition to finish before unmounting
    closeTimerRef.current = setTimeout(() => setMobileOpen(false), 300);
  };

  const showAuth = mounted && _initialized;
  const isScrolled = !isAtTop;
  const isHidden = scrollDirection === 'down' && !isAtTop && !mobileOpen;

  return (
    <>
      {/* Gradient accent line at very top */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-accent z-[51]" />

      <nav
        className={`fixed top-[2px] left-0 right-0 z-navbar transition-all duration-300 ${
          isScrolled
            ? 'bg-surface-bg/80 backdrop-blur-glass border-b border-glass-border shadow-glass'
            : 'bg-transparent'
        }`}
        style={{ transform: isHidden ? 'translateY(-80px)' : 'translateY(0)' }}
      >
        <div className="max-w-section mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <span className="text-xl font-heading font-bold text-gradient">
              ArtistBook
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/search">Find Artists</NavLink>
            <NavLink href="/artist/onboarding">List as Artist</NavLink>

            {showAuth && isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={getDashboardHref(user.role)}
                  className="text-sm font-medium text-text-primary bg-glass-medium hover:bg-glass-heavy px-4 py-2 rounded-lg border border-glass-border transition-all"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => logout()}
                  className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="relative text-sm font-semibold text-white bg-gradient-accent hover:bg-gradient-accent-hover px-5 py-2.5 rounded-pill transition-all shimmer-overlay hover-glow"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => mobileOpen ? handleCloseDrawer() : setMobileOpen(true)}
            className="md:hidden text-text-primary p-2 rounded-lg hover:bg-glass-light transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className={`fixed inset-0 bg-black/60 z-[48] md:hidden transition-opacity duration-300 ${
              drawerVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleCloseDrawer}
          />
          <div
            className={`fixed top-0 right-0 bottom-0 w-72 bg-surface-base border-l border-glass-border z-[49] md:hidden flex flex-col transition-transform duration-300 ease-out ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-6 border-b border-glass-border flex items-center justify-between">
              <span className="text-lg font-heading font-bold text-gradient">ArtistBook</span>
              <button onClick={handleCloseDrawer} className="text-text-muted p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-2">
              {[
                { href: '/search', label: 'Find Artists', icon: Search },
                { href: '/login', label: 'Event Company Login', icon: Building2 },
                { href: '/artist/onboarding', label: 'List as Artist', icon: Mic },
              ].map((item, i) => (
                <div
                  key={item.href}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                >
                  <Link
                    href={item.href}
                    onClick={handleCloseDrawer}
                    className="flex items-center justify-between p-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={18} className="text-text-muted" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                    <ChevronRight size={16} className="text-text-muted" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-glass-border">
              {showAuth && isAuthenticated && user ? (
                <div className="space-y-2">
                  <Link
                    href={getDashboardHref(user.role)}
                    onClick={handleCloseDrawer}
                    className="block w-full text-center text-sm font-medium text-white bg-gradient-accent px-4 py-3 rounded-lg"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { logout(); handleCloseDrawer(); }}
                    className="block w-full text-center text-sm text-text-muted hover:text-text-secondary py-2"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={handleCloseDrawer}
                  className="block w-full text-center text-sm font-semibold text-white bg-gradient-accent px-4 py-3 rounded-lg"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-sm text-text-secondary hover:text-text-primary transition-colors group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-accent group-hover:w-full transition-all duration-300" />
    </Link>
  );
}
