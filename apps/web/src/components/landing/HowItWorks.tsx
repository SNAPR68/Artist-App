'use client';

import { Search, MessageSquare, PartyPopper } from 'lucide-react';

const steps = [
  {
    step: '1',
    title: 'Search',
    desc: 'Browse by genre, city, or budget',
    icon: Search,
    color: 'from-primary-500 to-primary-600',
  },
  {
    step: '2',
    title: 'Book',
    desc: 'Get instant quotes & confirm',
    icon: MessageSquare,
    color: 'from-secondary-500 to-secondary-600',
  },
  {
    step: '3',
    title: 'Enjoy',
    desc: 'Escrow-protected payments',
    icon: PartyPopper,
    color: 'from-accent-magenta to-accent-pink',
  },
];

export function HowItWorks() {
  return (
    <section className="py-12 md:py-16 px-6">
      <div className="max-w-section mx-auto">
        <h2 className="text-lg md:text-xl font-heading font-bold text-text-primary mb-6">
          How It Works
        </h2>

        <div className="grid grid-cols-3 gap-3 md:gap-6">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              {/* Step Circle */}
              <div
                className={`relative w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center shadow-glow-sm`}
              >
                <s.icon size={22} className="text-white" />
              </div>
              <h3 className="text-sm md:text-base font-heading font-bold text-text-primary">{s.title}</h3>
              <p className="text-[11px] md:text-xs text-text-muted mt-1 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
