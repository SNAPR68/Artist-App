'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Search, Mic, ChevronRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [activeNavLink, setActiveNavLink] = useState<string | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleCloseDrawer = () => {
    closeTimerRef.current = setTimeout(() => setMobileOpen(false), 200);
  };

  const showAuth = mounted && _initialized;
  const isScrolled = !isAtTop;
  const isHidden = scrollDirection === 'down' && !isAtTop && !mobileOpen;

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-navbar"
      >
        <motion.div
          animate={{
            backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0)',
            borderBottomColor: isScrolled ? 'rgba(229, 231, 235, 0.5)' : 'rgba(229, 231, 235, 0)',
            boxShadow: isScrolled ? '0 1px 2px rgba(0, 0, 0, 0.05)' : '0 0 0 rgba(0, 0, 0, 0)',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="border-b backdrop-blur-xl"
        >
          <motion.div
            animate={{ y: isHidden ? -100 : 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            <div className="max-w-section mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          >
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </div>
              <span className="text-base font-heading font-bold text-neutral-900 tracking-tight">
                ArtistBook
              </span>
            </Link>
          </motion.div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/search" isActive={activeNavLink === '/search'} onHoverStart={() => setActiveNavLink('/search')} onHoverEnd={() => setActiveNavLink(null)}>
              Find Artists
            </NavLink>
            <NavLink href="/artist/onboarding" isActive={activeNavLink === '/artist/onboarding'} onHoverStart={() => setActiveNavLink('/artist/onboarding')} onHoverEnd={() => setActiveNavLink(null)}>
              List as Artist
            </NavLink>

            <motion.div
              className="w-px h-5 bg-neutral-200 mx-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            />

            {showAuth && isAuthenticated && user ? (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Link
                  href={getDashboardHref(user.role)}
                  className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 px-3.5 py-2 rounded-lg transition-all duration-200 min-h-11 flex items-center"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => logout()}
                  className="text-[13px] text-neutral-600 hover:text-neutral-900 px-2.5 py-2 transition-colors duration-200 min-h-11 flex items-center"
                >
                  Logout
                </button>
              </motion.div>
            ) : (
              <motion.a
                href="/login"
                whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="text-[13px] font-semibold text-white bg-neutral-900 px-5 py-2 rounded-full transition-all duration-200 min-h-11 flex items-center cursor-pointer"
              >
                Get Started
              </motion.a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => mobileOpen ? handleCloseDrawer() : setMobileOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden text-neutral-600 hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-100 transition-all duration-200 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={20} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
          </motion.div>
        </motion.div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-[48] md:hidden"
              onClick={handleCloseDrawer}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white border-l border-neutral-200 z-[49] md:hidden flex flex-col"
            >
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between min-h-16">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                  </div>
                  <span className="text-sm font-heading font-bold text-neutral-900">ArtistBook</span>
                </div>
                <motion.button
                  onClick={handleCloseDrawer}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-neutral-600 hover:text-neutral-900 p-1 transition-colors duration-200 min-h-11 min-w-11 flex items-center justify-center"
                >
                  <X size={18} />
                </motion.button>
              </div>

              <motion.div className="flex-1 p-4 space-y-1">
                {[
                  { href: '/search', label: 'Find Artists', icon: Search },
                  { href: '/login', label: 'Event Company Login', icon: Building2 },
                  { href: '/artist/onboarding', label: 'List as Artist', icon: Mic },
                ].map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      onClick={handleCloseDrawer}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all duration-200 min-h-11"
                    >
                      <span className="flex items-center gap-3">
                        <item.icon size={16} className="text-neutral-400" />
                        <span className="text-[13px] font-medium">{item.label}</span>
                      </span>
                      <ChevronRight size={14} className="text-neutral-400" />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="p-4 border-t border-neutral-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                {showAuth && isAuthenticated && user ? (
                  <div className="space-y-2">
                    <Link
                      href={getDashboardHref(user.role)}
                      onClick={handleCloseDrawer}
                      className="block w-full text-center text-[13px] font-semibold text-white bg-neutral-900 px-4 py-2.5 rounded-full transition-all duration-200 min-h-11 flex items-center justify-center"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); handleCloseDrawer(); }}
                      className="block w-full text-center text-[13px] text-neutral-600 hover:text-neutral-900 py-2 transition-colors duration-200 min-h-11 flex items-center justify-center"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={handleCloseDrawer}
                    className="block w-full text-center text-[13px] font-semibold text-white bg-neutral-900 px-4 py-2.5 rounded-full transition-all duration-200 min-h-11 flex items-center justify-center"
                  >
                    Get Started
                  </Link>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({
  href,
  children,
  isActive,
  onHoverStart,
  onHoverEnd,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) {
  return (
    <motion.div
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className="relative"
    >
      <Link
        href={href}
        className="text-[13px] text-neutral-600 hover:text-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200 font-medium min-h-11 flex items-center relative"
      >
        {children}
        {isActive && (
          <motion.span
            layoutId="navUnderline"
            className="absolute bottom-0 left-3 right-3 h-0.5 bg-violet-600 rounded-full"
            initial={false}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          />
        )}
      </Link>
    </motion.div>
  );
}
