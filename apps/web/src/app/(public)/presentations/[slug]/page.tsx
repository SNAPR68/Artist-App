'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Types ──────────────────────────────────────────────────────

interface PresentationArtist {
  id: string;
  stage_name: string;
  bio: string;
  genres: string[];
  city: string;
  trust_score: number;
  profile_image_url: string | null;
  notes: string | null;
  media: Array<{
    artist_id: string;
    media_type: string;
    url: string;
    thumbnail_url: string | null;
    title: string | null;
    sort_order: number;
  }>;
  pricing: Array<{
    artist_id: string;
    event_type: string;
    city_tier: string;
    base_price_paise: number;
    duration_hours: number;
  }>;
}

interface PresentationData {
  presentation: {
    id: string;
    title: string;
    custom_header: string | null;
    custom_footer: string | null;
    include_pricing: boolean;
    include_media: boolean;
    created_at: string;
  };
  workspace_branding: {
    name: string;
    logo_url: string | null;
    brand_color: string | null;
  } | null;
  artists: PresentationArtist[];
}

// ─── Helpers ────────────────────────────────────────────────────

function TrustStars({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= filled ? 'text-yellow-500' : 'text-gray-300'}>
          ★
        </span>
      ))}
      <span className="ml-1 text-xs text-gray-500">{score.toFixed(1)}</span>
    </div>
  );
}

function formatPriceINR(paise: number): string {
  return (paise / 100).toLocaleString('en-IN');
}

function truncateBio(bio: string, maxLen = 180): string {
  if (!bio || bio.length <= maxLen) return bio ?? '';
  return bio.slice(0, maxLen).trimEnd() + '...';
}

// ─── Component ──────────────────────────────────────────────────

export default function PublicPresentationPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<PresentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/v1/presentations/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.errors?.[0]?.message ?? 'Presentation not found');
        }
      })
      .catch(() => setError('Unable to load presentation'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900">Presentation not found</h1>
        <p className="text-gray-500 mt-2">
          {error || 'This presentation does not exist or has expired.'}
        </p>
      </div>
    );
  }

  const { presentation, workspace_branding, artists } = data;
  const brandColor = workspace_branding?.brand_color ?? '#1A3C6D';

  const pdfUrl = `${API_BASE_URL}/v1/presentations/${slug}/pdf`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Branded Header ─────────────────────────────────────── */}
      <header
        className="py-8 px-4"
        style={{ backgroundColor: brandColor }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            {workspace_branding?.logo_url && (
              <img
                src={workspace_branding.logo_url}
                alt={workspace_branding.name}
                className="h-12 w-auto rounded bg-white/20 p-1"
              />
            )}
            <div className="flex-1">
              <p className="text-white/80 text-sm font-medium">
                {workspace_branding?.name ?? 'Artist Lineup'}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {presentation.title}
              </h1>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors backdrop-blur-sm flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>
          </div>

          {presentation.custom_header && (
            <p className="text-white/90 mt-2 max-w-3xl leading-relaxed">
              {presentation.custom_header}
            </p>
          )}
        </div>
      </header>

      {/* ── Artist Grid ────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {artists.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500">No artists in this presentation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                includePricing={presentation.include_pricing}
                includeMedia={presentation.include_media}
                brandColor={brandColor}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {presentation.custom_footer && (
            <p className="text-gray-600 mb-4 leading-relaxed">
              {presentation.custom_footer}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Curated by {workspace_branding?.name ?? 'Artist Booking Platform'}</span>
            <span>{artists.length} artist{artists.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Artist Card ──────────────────────────────────────────────

function ArtistCard({
  artist,
  includePricing,
  includeMedia,
  brandColor,
}: {
  artist: PresentationArtist;
  includePricing: boolean;
  includeMedia: boolean;
  brandColor: string;
}) {
  // Compute price range from pricing entries
  let priceRange: { min: number; max: number } | null = null;
  if (includePricing && artist.pricing.length > 0) {
    const prices = artist.pricing.map((p) => p.base_price_paise);
    priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
  }

  // Get first 2 media items for thumbnails
  const mediaPreview = includeMedia ? artist.media.slice(0, 2) : [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Profile Image */}
      <div className="aspect-[4/3] bg-gray-100 relative">
        {artist.profile_image_url ? (
          <img
            src={artist.profile_image_url}
            alt={artist.stage_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        {/* Trust Score Badge */}
        {artist.trust_score > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
            <TrustStars score={artist.trust_score} />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{artist.stage_name}</h3>

        {artist.city && (
          <p className="text-sm text-gray-500 mt-0.5">{artist.city}</p>
        )}

        {/* Genres */}
        {artist.genres && artist.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {artist.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${brandColor}15`,
                  color: brandColor,
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {artist.bio && (
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            {truncateBio(artist.bio)}
          </p>
        )}

        {/* Pricing */}
        {priceRange && (
          <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 uppercase font-medium">Price Range</p>
            <p className="text-sm font-semibold text-gray-900">
              ₹{formatPriceINR(priceRange.min)}
              {priceRange.min !== priceRange.max && ` – ₹${formatPriceINR(priceRange.max)}`}
            </p>
          </div>
        )}

        {/* Media Thumbnails */}
        {mediaPreview.length > 0 && (
          <div className="flex gap-2 mt-3">
            {mediaPreview.map((item, idx) => (
              <div key={idx} className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {item.media_type === 'video' ? (
                  item.thumbnail_url ? (
                    <div className="relative w-full h-full">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title ?? 'Video thumbnail'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-white text-lg">▶</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-xs">
                      ▶ Video
                    </div>
                  )
                ) : (
                  <img
                    src={item.thumbnail_url ?? item.url}
                    alt={item.title ?? 'Media'}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom Notes */}
        {artist.notes && (
          <div
            className="mt-3 border-l-2 pl-3 py-1"
            style={{ borderColor: brandColor }}
          >
            <p className="text-xs text-gray-500 font-medium mb-0.5">Note</p>
            <p className="text-sm text-gray-700 italic">{artist.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
