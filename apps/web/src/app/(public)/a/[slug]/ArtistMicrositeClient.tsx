'use client';

/**
 * Standardized artist microsite — Nocturne Hollywood theme with brand-color
 * override from microsite_brand_color. Sections: hero, bio, featured media,
 * featured review, contact CTA. Deliberately lighter than /artists/[id] so the
 * short-link flows feel like a one-page EPK.
 */
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';

interface MediaItem {
  id: string;
  media_type: 'image' | 'video';
  original_url: string;
  thumbnail_url?: string;
  cdn_url?: string;
}

interface ReviewItem {
  id?: string;
  overall_rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

interface Artist {
  id: string;
  stage_name: string;
  bio?: string;
  base_city?: string;
  genres?: string[];
  languages?: string[];
  profile_image?: string;
  microsite_layout?: 'classic' | 'cinematic' | 'minimal';
  microsite_brand_color?: string | null;
  microsite_hero_image_url?: string | null;
  microsite_featured_media_ids?: string[] | null;
  microsite_featured_review_ids?: string[] | null;
  social_links?: Record<string, string> | null;
  media?: MediaItem[];
  reviews?: ReviewItem[];
  trust_score?: number;
  total_bookings?: number;
}

interface Props {
  artist: Artist;
  slug: string;
}

export default function ArtistMicrositeClient({ artist, slug }: Props) {
  const brand = artist.microsite_brand_color || '#c39bff';
  const hero = artist.microsite_hero_image_url || artist.profile_image;

  const featuredMedia = useMemo(() => {
    const ids = artist.microsite_featured_media_ids ?? [];
    const all = artist.media ?? [];
    if (!ids.length) return all.slice(0, 6);
    const byId = new Map(all.map((m) => [m.id, m]));
    return ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 6) as MediaItem[];
  }, [artist.media, artist.microsite_featured_media_ids]);

  const featuredReview = useMemo(() => {
    const ids = artist.microsite_featured_review_ids ?? [];
    const all = artist.reviews ?? [];
    if (!ids.length) return all[0];
    return all.find((r) => r.id && ids.includes(r.id)) ?? all[0];
  }, [artist.reviews, artist.microsite_featured_review_ids]);

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${brand}33, transparent 60%)` }}
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-10 md:pt-24 md:pb-16">
          {hero && (
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-white/10 mb-10">
              <Image
                src={hero}
                alt={artist.stage_name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f] via-transparent to-transparent" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <span
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-bold"
              style={{ color: brand }}
            >
              {artist.base_city ? `${artist.base_city} · ` : ''}
              {(artist.genres ?? []).slice(0, 3).join(' · ')}
            </span>
            <h1 className="font-display font-extrabold tracking-tighter text-5xl md:text-7xl">
              {artist.stage_name}
            </h1>
            {artist.bio && (
              <p className="text-white/70 max-w-2xl text-lg leading-relaxed">
                {artist.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href={`/artists/${artist.id}?utm_source=microsite&utm_medium=slug&utm_campaign=${slug}`}
                className="px-6 py-3 rounded-xl font-semibold text-black"
                style={{ background: brand }}
              >
                Book {artist.stage_name.split(' ')[0]}
              </Link>
              <Link
                href={`/brief?artist=${artist.id}`}
                className="px-6 py-3 rounded-xl font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                Get a custom proposal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      {(artist.trust_score || artist.total_bookings) && (
        <section className="border-y border-white/5 bg-[#1a191b]/50">
          <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat label="Trust Score" value={artist.trust_score ? `${artist.trust_score}/100` : '—'} />
            <Stat label="Shows" value={artist.total_bookings?.toString() ?? '—'} />
            <Stat label="Base City" value={artist.base_city ?? '—'} />
            <Stat
              label="Languages"
              value={(artist.languages ?? []).slice(0, 2).join(', ') || '—'}
            />
          </div>
        </section>
      )}

      {/* Featured media */}
      {featuredMedia.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-xs tracking-widest uppercase font-bold text-[#a1faff] mb-6">
            Featured Work
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featuredMedia.map((m) => (
              <div
                key={m.id}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/5 bg-[#1a191b]"
              >
                {m.media_type === 'image' ? (
                  <Image
                    src={m.cdn_url || m.thumbnail_url || m.original_url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <video
                    src={m.cdn_url || m.original_url}
                    poster={m.thumbnail_url}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured review */}
      {featuredReview && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <blockquote
            className="glass-card rounded-2xl p-8 border border-white/5"
            style={{ boxShadow: `0 0 60px -20px ${brand}55` }}
          >
            <div className="text-[#ffbf00] text-lg mb-3">
              {'★'.repeat(Math.round(featuredReview.overall_rating))}
            </div>
            <p className="text-white/80 text-xl leading-relaxed">
              &ldquo;{featuredReview.comment}&rdquo;
            </p>
            {featuredReview.reviewer_name && (
              <footer className="mt-4 text-sm text-white/50">
                — {featuredReview.reviewer_name}
              </footer>
            )}
          </blockquote>
        </section>
      )}

      {/* Social links */}
      {artist.social_links && Object.keys(artist.social_links).length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="flex flex-wrap gap-3">
            {Object.entries(artist.social_links).map(([platform, url]) =>
              url ? (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full text-xs tracking-widest uppercase font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  {platform}
                </a>
              ) : null,
            )}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="border-t border-white/5 bg-[#1a191b]/40">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h3 className="font-display font-extrabold tracking-tighter text-3xl md:text-4xl mb-4">
            Ready to book {artist.stage_name}?
          </h3>
          <p className="text-white/60 mb-8">
            Powered by GRID — the operating system for India&apos;s live entertainment industry.
          </p>
          <Link
            href={`/artists/${artist.id}`}
            className="inline-block px-8 py-4 rounded-xl font-semibold text-black"
            style={{ background: brand }}
          >
            Check availability
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs tracking-widest uppercase font-bold text-white/50">{label}</div>
      <div className="font-display font-bold text-2xl mt-1">{value}</div>
    </div>
  );
}
