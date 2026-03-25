'use client';

import Link from 'next/link';
import { Instagram, Youtube, Twitter, Linkedin, Shield, BadgeCheck, Headphones, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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

const LinkColumn = ({ title, links, index }: { title: string; links: typeof footerLinks['For Clients']; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
    viewport={{ once: true, amount: 0.3 }}
  >
    <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4">
      {title}
    </h3>
    <ul className="space-y-3">
      {links.map((link) => (
        <li key={link.label}>
          <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Link
              href={link.href}
              className="text-neutral-400 hover:text-white transition-colors text-sm"
            >
              {link.label}
            </Link>
          </motion.div>
        </li>
      ))}
    </ul>
  </motion.div>
);

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <motion.div
                className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-violet-700"
                whileHover={{ scale: 1.1, rotate: 5 }}
              />
              <span className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">
                ArtistBook
              </span>
            </Link>

            {/* Description */}
            <p className="text-sm text-neutral-400 leading-relaxed mb-8 max-w-xs">
              India&apos;s #1 live entertainment marketplace. Book verified artists for weddings, corporate events, concerts &amp; more.
            </p>

            {/* Newsletter */}
            <motion.div
              className="flex gap-2 max-w-xs mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
              >
                <motion.div animate={{ x: [0, 2, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight size={16} />
                </motion.div>
              </motion.button>
            </motion.div>

            {/* Social Icons */}
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                  whileHover={{ y: -3, color: '#fff' }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <social.icon size={16} />
                </motion.a>
              ))}
            </motion.div>
          </motion.div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links], i) => (
            <LinkColumn key={title} title={title} links={links} index={i} />
          ))}
        </div>

        {/* Divider */}
        <motion.div
          className="border-t border-neutral-800 mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        />

        {/* Trust Badges */}
        <motion.div
          className="flex flex-wrap gap-4 pb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          viewport={{ once: true }}
        >
          {trustBadges.map((badge, index) => (
            <motion.div
              key={badge.label}
              className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.45 + index * 0.05 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <badge.icon size={16} className="text-violet-400" />
              <span className="text-xs font-medium text-neutral-300">{badge.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-neutral-800"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} ArtistBook. All rights reserved.
          </p>
          <p className="text-xs text-neutral-500">
            Made with love in India
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
