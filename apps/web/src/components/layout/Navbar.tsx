'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, Mic, ChevronRight } from 'lucide-react';
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

  useEffect(() => { setMounted(true); }, []);

  const showAuth = mounted && _initialized;
  const isScrolled = !isAtTop;
  const isHidden = scrollDirection === 'down' && !isAtTop && !mobileOpen;

  return (
    <>
      {/* Gradient accent line at very top */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-accent z-[51]" />

      <motion.nav
        className={`fixed top-[2px] left-0 right-0 z-navbar transition-all duration-300 ${
          isScrolled
            ? 'bg-surface-bg/80 backdrop-blur-glass border-b border-glass-border shadow-glass'
            : 'bg-transparent'
        }`}
        animate={{ y: isHidden ? -80 : 0 }}
        transition={{ duration: 0.3 }}
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
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-text-primary p-2 rounded-lg hover:bg-glass-light transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-[48] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-72 bg-surface-base border-l border-glass-border z-[49] md:hidden flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-6 border-b border-glass-border flex items-center justify-between">
                <span className="text-lg font-heading font-bold text-gradient">ArtistBook</span>
                <button onClick={() => setMobileOpen(false)} className="text-text-muted p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-2">
                {[
                  { href: '/search', label: 'Find Artists', icon: Search },
                  { href: '/artist/onboarding', label: 'List as Artist', icon: Mic },
                ].map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between p-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <item.icon size={18} className="text-text-muted" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </span>
                      <ChevronRight size={16} className="text-text-muted" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 border-t border-glass-border">
                {showAuth && isAuthenticated && user ? (
                  <div className="space-y-2">
                    <Link
                      href={getDashboardHref(user.role)}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center text-sm font-medium text-white bg-gradient-accent px-4 py-3 rounded-lg"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="block w-full text-center text-sm text-text-muted hover:text-text-secondary py-2"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center text-sm font-semibold text-white bg-gradient-accent px-4 py-3 rounded-lg"
                  >
                    Get Started
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
