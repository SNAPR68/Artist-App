import type { Metadata } from 'next';
import BriefPageClient from './BriefPageClient';

export const metadata: Metadata = {
  title: 'What Should You Book? | Slash for Events',
  description: 'Tell us about your event and get instant artist recommendations with pricing, fit scores, and risk flags.',
  openGraph: {
    title: 'What Should You Book?',
    description: 'Instant artist recommendations for your event',
  },
};

export default function BriefPage() {
  return <BriefPageClient />;
}
