'use client';

import { Search, MessageSquare, PartyPopper } from 'lucide-react';
const steps = [
  {
    step: '01',
    title: 'Search & Discover',
    desc: 'Browse artists by genre, city, budget, and availability. Compare profiles side by side.',
    icon: Search,
    color: 'from-primary-500 to-primary-600',
  },
  {
    step: '02',
    title: 'Book Instantly',
    desc: 'Share your event details. Get a quote within hours, not days. Confirm in minutes.',
    icon: MessageSquare,
    color: 'from-secondary-500 to-secondary-600',
  },
  {
    step: '03',
    title: 'Enjoy Your Event',
    desc: 'Artist shows up, you enjoy a memorable experience. Escrow-protected payments for peace of mind.',
    icon: PartyPopper,
    color: 'from-accent-magenta to-accent-pink',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-section mx-auto">
        <div>
          <h2 className="text-h2 font-heading font-bold text-text-primary text-center mb-3">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-text-muted text-center mb-16">
            Book an artist in 3 simple steps
          </p>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-[2px]">
              <div className="h-[2px] bg-gradient-accent" />
            </div>

            {steps.map((s) => (
              <div
                key={s.step}
                className="relative text-center"
              >
                {/* Step Circle */}
                <div
                  className={`relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center shadow-glow-md`}
                >
                  <s.icon size={24} className="text-white" />
                </div>

                {/* Step Number */}
                <div className="text-6xl font-heading font-black text-glass-light/50 absolute top-0 right-4 md:right-8 select-none">
                  {s.step}
                </div>

                <h3 className="text-h4 font-heading font-bold text-text-primary mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
