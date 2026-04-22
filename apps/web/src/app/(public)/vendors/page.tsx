import type { Metadata } from 'next';
import VendorsPageClient from './VendorsPageClient';

export const metadata: Metadata = {
  title: 'Find Vendors | GRID',
  description:
    'Browse artists, AV, photo, decor, and license vendors for your event — one unified directory powered by GRID.',
  openGraph: {
    title: 'Find Vendors',
    description: 'Artists, AV, photo, decor, license — all in one place.',
  },
};

export default function VendorsPage() {
  return <VendorsPageClient />;
}
