'use client';

import { CountUp } from '@/components/shared/CountUp';

const stats = [
  { value: 5000, suffix: '+', label: 'Artists', color: 'from-primary-500 to-primary-600' },
  { value: 10000, suffix: '+', label: 'Events', color: 'from-secondary-500 to-secondary-600' },
  { value: 50, suffix: '+', label: 'Cities', color: 'from-accent-magenta to-accent-pink' },
  { value: 4.8, suffix: '/5', label: 'Rating', color: 'from-amber-500 to-orange-500' },
];

export function StatsBar() {
  return (
    <section className="py-8 px-6">
      <div className="max-w-section mx-auto">
        <div className="flex items-center justify-around gap-2 py-6 px-4 rounded-2xl bg-glass-medium border border-glass-border">
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center flex-1">
              <div className="text-xl md:text-2xl font-heading font-bold text-text-primary">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-[10px] md:text-xs text-text-muted mt-0.5">{stat.label}</p>
              {i < stats.length - 1 && (
                <div className="hidden" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
