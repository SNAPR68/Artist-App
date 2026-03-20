'use client';

import { ShieldCheck, Clock, Wallet, Lock } from 'lucide-react';
import { CountUp } from '@/components/shared/CountUp';

const stats = [
  { value: 5000, suffix: '+', label: 'Verified Artists', icon: ShieldCheck, color: 'text-primary-400' },
  { value: '<24hrs', label: 'Average Booking Time', icon: Clock, color: 'text-secondary-400' },
  { value: 0, prefix: '₹', label: 'Platform Fee for Artists', icon: Wallet, color: 'text-accent-magenta' },
  { value: 100, suffix: '%', label: 'Secure Payments', icon: Lock, color: 'text-green-400' },
];

export function StatsBar() {
  return (
    <section className="relative py-16 px-6">
      <div className="max-w-section mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center group">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-glass-light mb-3 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div className="text-2xl md:text-3xl font-heading font-bold text-text-primary">
                  {typeof stat.value === 'string' ? (
                    <CountUp end={stat.value} className="" />
                  ) : (
                    <CountUp end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-text-muted mt-1">{stat.label}</p>
              </div>
          ))}
        </div>
      </div>
    </section>
  );
}
