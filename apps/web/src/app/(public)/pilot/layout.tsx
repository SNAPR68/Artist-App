import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GRID Pilot — Event Company OS · Free for 90 days',
  description:
    'Run your next event on GRID. Multi-vendor Event File, auto call sheets, day-of check-ins, EPK on demand. Free pilot for 10 event companies in Mumbai, Delhi, Bengaluru, Goa.',
  openGraph: {
    title: 'GRID Pilot — Event Company OS',
    description:
      'Free 90-day pilot. One file covers every vendor. Call sheets, day-of check-ins, EPKs — generated, not assembled.',
    type: 'website',
  },
};

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
