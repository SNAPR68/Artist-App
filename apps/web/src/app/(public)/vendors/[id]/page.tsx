import type { Metadata } from 'next';
import VendorDetailClient from './VendorDetailClient';

export const metadata: Metadata = {
  title: 'Vendor Profile | GRID',
  description: 'Book this vendor for your event via GRID.',
};

export default function VendorDetailPage() {
  return <VendorDetailClient />;
}
