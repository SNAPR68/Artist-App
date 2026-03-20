'use client';

import { Shield, BadgeCheck, Clock } from 'lucide-react';
const signals = [
  {
    icon: Shield,
    title: 'Escrow Protection',
    desc: 'Your payment is held securely until the event is completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Artists',
    desc: 'Every artist is ID-verified with ratings and reviews',
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
  {
    icon: Clock,
    title: 'Book in 24 Hours',
    desc: 'No more weeks of back-and-forth. Get confirmed fast.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
];

export function TrustSignals() {
  return (
    <section className="py-16 px-6 border-t border-glass-border">
      <div className="max-w-5xl mx-auto">
        <div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {signals.map((signal) => (
              <div
                key={signal.title}
                className="flex flex-col items-center"
              >
                <div className={`w-12 h-12 ${signal.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                  <signal.icon size={22} className={signal.color} />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">{signal.title}</h3>
                <p className="text-sm text-text-muted">{signal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
