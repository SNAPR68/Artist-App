'use client';

import { Shield, BadgeCheck, Clock, CreditCard } from 'lucide-react';

const signals = [
  {
    icon: Shield,
    label: 'Escrow Protection',
    color: 'from-green-500 to-green-600',
    lightColor: 'from-green-500/20 to-green-600/20',
  },
  {
    icon: BadgeCheck,
    label: 'Verified Artists',
    color: 'from-primary-500 to-primary-600',
    lightColor: 'from-primary-500/20 to-primary-600/20',
  },
  {
    icon: Clock,
    label: 'Book in 24hrs',
    color: 'from-amber-500 to-orange-500',
    lightColor: 'from-amber-500/20 to-orange-500/20',
  },
  {
    icon: CreditCard,
    label: 'Secure Payments',
    color: 'from-secondary-500 to-secondary-600',
    lightColor: 'from-secondary-500/20 to-secondary-600/20',
  },
];

export function TrustSignals() {
  return (
    <section className="py-12 md:py-16 px-6 border-t border-glass-border">
      <div className="max-w-section mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h3 className="text-lg md:text-xl font-heading font-bold text-text-primary mb-2">
            Trusted by 10,000+ Customers
          </h3>
          <p className="text-sm text-text-muted">
            Built with security, reliability, and transparency at our core
          </p>
        </div>

        {/* Signals Grid */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {signals.map((signal, idx) => (
            <div
              key={signal.label}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Glass pill/badge */}
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-full bg-glass-medium border border-glass-border hover:border-glass-border/80 transition-all duration-300 hover:bg-glass-light hover:shadow-glow-sm hover:scale-105">
                {/* Icon with gradient background */}
                <div className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${signal.color} flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-sm transition-all duration-300`}>
                  <signal.icon size={16} className="text-white" />
                </div>

                {/* Label */}
                <span className="text-sm font-medium text-text-primary whitespace-nowrap">
                  {signal.label}
                </span>

                {/* Hover glow indicator */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 20px rgba(59, 130, 246, 0.15)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
