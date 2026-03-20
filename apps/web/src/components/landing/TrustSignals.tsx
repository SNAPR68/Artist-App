'use client';

import { Shield, BadgeCheck, Clock, CreditCard } from 'lucide-react';

const signals = [
  { icon: Shield, label: 'Escrow Protection', color: 'text-green-400' },
  { icon: BadgeCheck, label: 'Verified Artists', color: 'text-primary-400' },
  { icon: Clock, label: 'Book in 24hrs', color: 'text-amber-400' },
  { icon: CreditCard, label: 'Secure Payments', color: 'text-secondary-400' },
];

export function TrustSignals() {
  return (
    <section className="py-8 px-6 border-t border-glass-border">
      <div className="max-w-section mx-auto">
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {signals.map((signal) => (
            <div key={signal.label} className="flex items-center gap-2">
              <signal.icon size={16} className={signal.color} />
              <span className="text-xs font-medium text-text-muted">{signal.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
