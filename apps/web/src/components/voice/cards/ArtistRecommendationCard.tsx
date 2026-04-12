'use client';

import Link from 'next/link';
import type { VoiceArtistCard } from '@artist-booking/shared';

function formatPaise(paise: number | null | undefined): string {
  if (!paise) return '—';
  const rupees = paise / 100;
  if (rupees >= 100000) return `${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `${(rupees / 1000).toFixed(0)}k`;
  return `${rupees.toLocaleString('en-IN')}`;
}

function ConfidenceDot({ confidence }: { confidence?: number }) {
  if (!confidence) return null;
  const color = confidence >= 0.8 ? '#22c55e' : confidence >= 0.5 ? '#eab308' : '#6b7280';
  const label = confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Good' : 'Fair';
  return (
    <span className="flex items-center gap-1 text-[10px]" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label} fit
    </span>
  );
}

export function ArtistRecommendationCard({ artist, onSelect }: { artist: VoiceArtistCard; onSelect?: (id: string) => void }) {
  const hasDecisionData = artist.why_fit && artist.why_fit.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1a191b]/80 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-all" role="article" aria-label={`Artist recommendation: ${artist.stage_name}`}>
      {/* Header: Image + Name */}
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
          {artist.thumbnail_url ? (
            <img src={artist.thumbnail_url} alt={artist.stage_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-lg font-bold">
              {artist.stage_name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name + Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">{artist.stage_name}</h4>
            {artist.rank && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                #{artist.rank}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {artist.artist_type && <span className="text-[10px] text-white/40">{artist.artist_type}</span>}
            {artist.base_city && <span className="text-[10px] text-white/30">· {artist.base_city}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <ConfidenceDot confidence={artist.confidence} />
            {artist.trust_score && (
              <span className="text-[10px] text-[#ffbf00] flex items-center gap-0.5">
                ★ {artist.trust_score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <span className="text-xs text-white/60">
          ₹{formatPaise(artist.price_min_paise)}
          {artist.price_max_paise ? ` – ₹${formatPaise(artist.price_max_paise)}` : '+'}
        </span>
        {artist.expected_close_paise && (
          <span className="text-[10px] text-white/30">
            (likely ₹{formatPaise(artist.expected_close_paise)})
          </span>
        )}
      </div>

      {/* Why-Fit Bullets (decision engine cards) */}
      {hasDecisionData && (
        <div className="px-3 pb-2 space-y-1">
          {artist.why_fit!.slice(0, 3).map((reason, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-emerald-400/80">
              <span className="mt-0.5">✓</span>
              <span className="text-white/50">{reason}</span>
            </div>
          ))}
          {artist.risk_flags && artist.risk_flags.length > 0 && (
            <div className="flex items-start gap-1.5 text-[10px] text-amber-400/80">
              <span className="mt-0.5">⚠</span>
              <span className="text-white/40">{artist.risk_flags[0]}</span>
            </div>
          )}
        </div>
      )}

      {/* Genres */}
      {artist.genres && artist.genres.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {artist.genres.slice(0, 3).map(g => (
            <span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10 text-white/30">
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex border-t border-white/5">
        <Link
          href={`/artists/${artist.id}`}
          className="flex-1 text-center text-[11px] text-white/40 hover:text-white hover:bg-white/5 py-2 transition-colors"
        >
          View Profile
        </Link>
        {onSelect && (
          <button
            onClick={() => onSelect(artist.id)}
            className="flex-1 text-center text-[11px] text-[#c39bff] hover:bg-[#c39bff]/10 py-2 transition-colors border-l border-white/5"
          >
            Select
          </button>
        )}
      </div>
    </div>
  );
}
