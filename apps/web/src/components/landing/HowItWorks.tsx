'use client';

import { Search, MessageSquare, PartyPopper, ArrowRight } from 'lucide-react';

const steps = [
  {
    step: '1',
    title: 'Search',
    desc: 'Browse thousands of artists by genre, location, budget, and availability',
    icon: Search,
    color: 'from-primary-500 to-primary-600',
  },
  {
    step: '2',
    title: 'Book',
    desc: 'Get instant quotes from verified artists and confirm your booking',
    icon: MessageSquare,
    color: 'from-secondary-500 to-secondary-600',
  },
  {
    step: '3',
    title: 'Enjoy',
    desc: 'Relax knowing your payment is protected in escrow until performance',
    icon: PartyPopper,
    color: 'from-accent-magenta to-accent-pink',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24 px-6 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-bg/50 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-section mx-auto relative z-10">
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-gradient mb-3">
            How It Works
          </h2>
          <p className="text-text-muted text-sm md:text-base max-w-md">
            Three simple steps to connect with the perfect artist for your event
          </p>
        </div>

        {/* Steps Container */}
        <div className="relative">
          {/* Connecting Lines (hidden on mobile) */}
          <div className="hidden md:block absolute top-[50px] left-1/4 right-1/4 h-1 bg-gradient-to-r from-primary-500/20 via-secondary-500/30 to-accent-magenta/20 transform -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative z-10">
            {steps.map((s, idx) => (
              <div key={s.step} className="flex flex-col items-center text-center">
                {/* Step Circle with Animated Border */}
                <div className="relative mb-6">
                  {/* Outer glow ring */}
                  <div
                    className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-fade-in`}
                    style={{
                      boxShadow: `inset 0 0 20px rgba(59, 130, 246, 0.3)`,
                    }}
                  />

                  {/* Main circle */}
                  <div
                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center shadow-glow-sm border-2 border-white/10 group hover:border-white/20 transition-all duration-300 hover:scale-110`}
                  >
                    <s.icon size={28} className="text-white md:w-8 md:h-8" />
                  </div>

                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-accent-magenta to-accent-pink flex items-center justify-center text-white text-xs font-bold shadow-glow-sm border border-white/20">
                    {s.step}
                  </div>
                </div>

                {/* Connector arrow (mobile) */}
                {idx < steps.length - 1 && (
                  <div className="md:hidden mb-4 text-primary-400">
                    <ArrowRight size={20} className="rotate-90" />
                  </div>
                )}

                {/* Text Content */}
                <h3 className="text-lg md:text-xl font-heading font-bold text-text-primary mb-2">
                  {s.title}
                </h3>
                <p className="text-sm md:text-base text-text-muted leading-relaxed max-w-xs">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
