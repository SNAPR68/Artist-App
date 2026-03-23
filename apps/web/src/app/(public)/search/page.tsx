import type { Metadata } from 'next';
import SearchPageClient from './SearchPageClient';

export const metadata: Metadata = {
  title: 'Find Artists | Artist Booking',
  description: 'Search and book live entertainment artists for your event in India',
  openGraph: {
    title: 'Find Artists',
    description: 'Search and book live entertainment',
  },
};

export default function SearchPage() {
  return <SearchPageClient />;
}
