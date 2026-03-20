'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

interface Review {
  overall_rating: number;
  comment: string;
  created_at: string;
}

interface ArtistReviewsProps {
  reviews: Review[];
}

export function ArtistReviews({ reviews }: ArtistReviewsProps) {
  const [showAll, setShowAll] = useState(false);

  if (!reviews.length) return null;

  const avgRating = (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1);
  const displayed = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-heading font-semibold text-text-primary">Reviews</h2>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-pill bg-glass-light border border-glass-border">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium text-text-primary">{avgRating}</span>
            <span className="text-xs text-text-muted">({reviews.length})</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayed.map((review, i) => (
          <AnimatedSection key={i} delay={i * 0.05}>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={12}
                      className={j < review.overall_rating ? 'text-amber-400 fill-amber-400' : 'text-surface-elevated'}
                    />
                  ))}
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(review.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-text-secondary leading-relaxed">{review.comment}</p>
              )}
            </div>
          </AnimatedSection>
        ))}
      </div>

      {reviews.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
        >
          {showAll ? 'Show less' : `See all ${reviews.length} reviews`}
        </button>
      )}
    </div>
  );
}
