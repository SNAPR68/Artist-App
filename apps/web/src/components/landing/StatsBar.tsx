'use client';

import { Users, Calendar, MapPin, Star } from 'lucide-react';
import { CountUp } from '@/components/shared/CountUp';

const stats = [
  { value: 5000, suffix: '+', label: 'Artists', icon: Users, color: 'from-primary-500 to-primary-600', lightColor: 'from-primary-500/20 to-primary-600/20' },
  { value: 10000, suffix: '+', label: 'Events', icon: Calendar, color: 'from-secondary-500 to-secondary-600', lightColor: 'from-secondary-500/20 to-secondary-600/20' },
  { value: 50, suffix: '+', label: 'Cities', icon: MapPin, color: 'from-accent-magenta to-accent-pink', lightColor: 'from-accent-magenta/20 to-accent-pink/20' },
  { value: 4.8, suffix: '/5', label: 'Rating', icon: Star, color: 'from-amber-500 to-orange-500', lightColor: 'from-amber-500/20 to-orange-500/20' },
];

export function StatsBar() {
  return (
    <section className="py-10 md:py-14 px-6">
      <div className="max-w-section mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl p-6 bg-glass-medium border border-glass-border hover:border-glass-border/80 transition-all duration-300 hover:shadow-glow-sm hover:bg-glass-light"
            >
              {/* Gradient background on hover */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-br ${stat.lightColor} pointer-events-none`}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-4 shadow-glow-sm`}>
                  <stat.icon size={24} className="text-white" />
                </div>

                {/* Stats Value */}
                <div className="mb-2">
                  <div className="text-2xl md:text-3xl font-heading font-bold text-text-primary">
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  </div>
                </div>

                {/* Label */}
                <p className="text-xs md:text-sm text-text-muted font-medium">{stat.label}</p>

                {/* Divider line */}
                {i < stats.length - 1 && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 hidden lg:block w-px h-8 bg-gradient-to-b from-transparent via-glass-border to-transparent" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
