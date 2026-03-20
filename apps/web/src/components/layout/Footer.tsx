'use client';

import Link from 'next/link';
import { Instagram, Youtube, Twitter, Linkedin, Shield, BadgeCheck, Headphones, ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const footerLinks = {
  'For Clients': [
    { label: 'Find Artists', href: '/search' },
    { label: 'Wedding Artists', href: '/search?event_type=wedding' },
    { label: 'Corporate Events', href: '/search?event_type=corporate' },
    { label: 'House Parties', href: '/search?event_type=house_party' },
  ],
  'For Artists': [
    { label: 'Join as Artist', href: '/artist/onboarding' },
    { label: 'Artist Login', href: '/login' },
    { label: 'Pricing Guide', href: '/help' },
  ],
  'Company': [
    { label: 'Help & FAQ', href: '/help' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

const socialLinks = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

const trustBadges = [
  { icon: Shield, label: 'Secure Payments' },
  { icon: BadgeCheck, label: 'Verified Artists' },
  { icon: Headphones, label: '24/7 Support' },
];

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-surface-card to-surface-bg border-t border-glass-border">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-accent opacity-40" />

      <div className="max-w-section mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <AnimatedSection>
              <Link href="/" className="text-2xl font-heading font-bold text-gradient inline-block mb-4">
                ArtistBook
              </Link>
              <p className="text-text-muted text-sm leading-relaxed mb-6 max-w-sm">
                India&apos;s #1 live entertainment marketplace. Book verified artists for weddings,
                corporate events, concerts &amp; more.
              </p>

              {/* Newsletter */}
              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 bg-glass-light border border-glass-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-colors"
                />
                <button className="px-4 py-2.5 bg-gradient-accent hover:bg-gradient-accent-hover text-white text-sm font-medium rounded-lg transition-all hover-glow flex items-center gap-1.5">
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Social Icons */}
              <div className="flex gap-3 mt-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-lg bg-glass-light border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/30 hover:shadow-glow-sm transition-all"
                  >
                    <social.icon size={16} />
                  </a>
                ))}
              </div>
            </AnimatedSection>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links], i) => (
            <AnimatedSection key={title} delay={0.1 + i * 0.05}>
              <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 py-6 border-t border-glass-border mb-6">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-text-muted">
              <badge.icon size={16} className="text-primary-400" />
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-glass-border">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} ArtistBook. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            Made with love in India
          </p>
        </div>
      </div>
    </footer>
  );
}
