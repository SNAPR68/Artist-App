import type { Metadata } from 'next';
import ArtistPageClient from './ArtistPageClient';

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/artists/${id}`,
      { next: { revalidate: 300 } }
    );
    const json = await res.json().catch(() => null);
    const artist = json?.data;

    if (!artist) {
      return {
        title: 'Artist | Artist Booking',
        description: 'Book live entertainment for your event',
      };
    }

    return {
      title: `${artist.stage_name} | Artist Booking`,
      description: artist.bio?.substring(0, 160) || 'Book live entertainment for your event',
      openGraph: {
        title: artist.stage_name,
        description: artist.bio?.substring(0, 160),
        images: artist.profile_image ? [{ url: artist.profile_image }] : [],
        type: 'profile',
      },
      twitter: { card: 'summary_large_image' },
    };
  } catch {
    return {
      title: 'Artist | Artist Booking',
      description: 'Book live entertainment for your event',
    };
  }
}

export default function ArtistPage() {
  return <ArtistPageClient />;
}
