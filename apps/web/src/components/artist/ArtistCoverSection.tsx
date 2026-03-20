'use client';

import { motion } from 'framer-motion';
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
        <motion.div
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-card border-4 border-surface-bg gradient-border overflow-hidden flex items-center justify-center text-4xl text-text-muted"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {stageName.charAt(0)}
        </motion.div>

        {/* Info */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
        </motion.div>

        {/* Trust Score */}
        <motion.div
          className="text-center px-4 py-2 glass-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-1">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span className="text-xl font-heading font-bold text-text-primary">{trustScore ?? 0}</span>
          </div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Trust Score</p>
        </motion.div>
      </div>
    </div>
  );
}
