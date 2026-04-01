'use client';

import type {
  VoiceCard,
  VoiceArtistCard,
  VoiceBookingCard,
  VoiceProposalCard,
  VoiceEarningsCard,
  VoiceConfirmationCard,
} from '@artist-booking/shared';
import { ArtistRecommendationCard } from './ArtistRecommendationCard';
import { BookingStatusCard } from './BookingStatusCard';
import { ProposalCard } from './ProposalCard';
import { EarningsSummaryCard } from './EarningsSummaryCard';
import { ConfirmationCard } from './ConfirmationCard';

interface CardRendererProps {
  cards: VoiceCard[];
  onSelectArtist?: (id: string) => void;
  onGenerateProposal?: (briefId: string) => void;
  onConfirm?: (payload?: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function CardRenderer({ cards, onSelectArtist, onGenerateProposal, onConfirm, onCancel }: CardRendererProps) {
  if (!cards || cards.length === 0) return null;

  // Group artist cards for grid layout
  const artistCards = cards.filter(c => c.type === 'artist_recommendation' || c.type === 'artist_discover');
  const otherCards = cards.filter(c => c.type !== 'artist_recommendation' && c.type !== 'artist_discover');

  return (
    <div className="space-y-2 mt-2">
      {/* Artist cards in a scrollable row or 2-col grid */}
      {artistCards.length > 0 && (
        <div className={artistCards.length <= 2
          ? 'flex gap-2'
          : 'flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none'
        }>
          {artistCards.map((card, i) => (
            <div
              key={i}
              className={artistCards.length <= 2 ? 'flex-1 min-w-0' : 'w-[260px] flex-shrink-0 snap-start'}
            >
              <ArtistRecommendationCard
                artist={card.data as VoiceArtistCard}
                onSelect={onSelectArtist}
              />
            </div>
          ))}
        </div>
      )}

      {/* Other cards stacked */}
      {otherCards.map((card, i) => {
        switch (card.type) {
          case 'booking_status':
            return <BookingStatusCard key={i} booking={card.data as VoiceBookingCard} />;
          case 'proposal_summary':
            return <ProposalCard key={i} proposal={card.data as VoiceProposalCard} onGenerate={onGenerateProposal} />;
          case 'earnings_summary':
            return <EarningsSummaryCard key={i} earnings={card.data as VoiceEarningsCard} />;
          case 'confirmation_prompt':
            return <ConfirmationCard key={i} confirmation={card.data as VoiceConfirmationCard} onConfirm={onConfirm} onCancel={onCancel} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
