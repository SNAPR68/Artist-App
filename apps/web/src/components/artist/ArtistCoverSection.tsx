'use client';

import { BadgeCheck, MapPin, Star } from 'lucide-react';

interface ArtistCoverSectionProps {
  stageName: string;
  baseCity: string;
  travelRadiusKm: number;
  trustScore: number;
  isVerified: boolean;
  coverUrl?: string;
}

export function ArtistCoverSection({
  stageName,
  baseCity,
  travelRadiusKm,
  trustScore,
  isVerified,
  coverUrl,
}: ArtistCoverSectionProps) {
  return (
    <div className="relative mb-8">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={stageName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500/20 via-secondary-500/10 to-accent-magenta/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bg via-surface-bg/40 to-transparent" />
      </div>

      {/* Profile Section */}
      <div className="relative -mt-16 px-4 sm:px-0 flex flex-col sm:flex-row items-start sm:items-end gap-4">
        {/* Avatar */}
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-card border-4 border-surface-bg gradient-border overflow-hidden flex items-center justify-center text-4xl text-text-muted animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}
        >
          {stageName.charAt(0)}
        </div>

        {/* Info */}
        <div
          className="flex-1 animate-fade-in-up"
          style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-h2 font-heading font-bold text-text-primary">{stageName}</h1>
            {isVerified && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary-500/15 text-primary-400 text-xs font-medium">
                <BadgeCheck size={12} />
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {baseCity} · Travels up to {travelRadiusKm} km
            </span>
          </div>
        </div>

        {/* Trust Score */}
        <div
          className="text-center px-4 py-2 glass-card animate-fade-in-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-1">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span className="text-xl font-heading font-bold text-text-primary">{trustScore ?? 0}</span>
          </div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Trust Score</p>
        </div>
      </div>
    </div>
  );
}
