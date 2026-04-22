/**
 * Event Company OS pivot (2026-04-22) — Standardized artist microsite.
 *
 * Short-link surface `/a/[slug]` resolves the slug to the canonical artist id
 * via the API (GET /v1/artists/by-slug/:slug) and renders the full profile.
 * Separate from `/artists/[id]` so we can swap in a lighter template later
 * without breaking existing deep links.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtistMicrositeClient from './ArtistMicrositeClient';

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchBySlug(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/artists/by-slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await fetchBySlug(slug);
  if (!artist) {
    return { title: 'Artist | GRID', description: 'Live entertainment, reinvented.' };
  }
  const hero = artist.microsite_hero_image_url || artist.profile_image;
  return {
    title: `${artist.stage_name} | GRID`,
    description: artist.bio?.substring(0, 160) || 'Book live entertainment on GRID',
    openGraph: {
      title: artist.stage_name,
      description: artist.bio?.substring(0, 160),
      images: hero ? [{ url: hero }] : [],
      type: 'profile',
      url: `/a/${slug}`,
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ArtistMicrositePage({ params }: Props) {
  const { slug } = await params;
  const artist = await fetchBySlug(slug);
  if (!artist) notFound();
  return <ArtistMicrositeClient artist={artist} slug={slug} />;
}
