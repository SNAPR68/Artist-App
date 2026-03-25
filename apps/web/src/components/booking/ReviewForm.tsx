'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface ReviewFormProps {
  bookingId: string;
  onSubmitSuccess: () => void;
}

interface ReviewDimensions {
  punctuality: number;
  professionalism: number;
  crowd_engagement: number;
  sound_quality: number;
  value_for_money: number;
}

const DIMENSIONS = [
  {
    key: 'punctuality',
    label: 'Punctuality',
    description: 'Did the artist arrive on time and start on schedule?',
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    description: 'How professional was the artist\'s conduct and appearance?',
  },
  {
    key: 'crowd_engagement',
    label: 'Crowd Engagement',
    description: 'How well did the artist engage with your audience?',
  },
  {
    key: 'sound_quality',
    label: 'Sound Quality',
    description: 'How was the audio quality and technical execution?',
  },
  {
    key: 'value_for_money',
    label: 'Value for Money',
    description: 'Did the performance justify the cost?',
  },
];

function StarRating({
  rating,
  onChange,
  label,
  description,
}: {
  rating: number;
  onChange: (rating: number) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-nocturne-text-primary">{label}</label>
        <p className="text-xs text-nocturne-text-secondary mt-0.5">{description}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-colors ${
              star <= rating ? 'text-nocturne-gold' : 'text-nocturne-text-tertiary hover:text-nocturne-gold/60'
            }`}
          >
            <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ bookingId, onSubmitSuccess }: ReviewFormProps) {
  const [dimensions, setDimensions] = useState<ReviewDimensions>({
    punctuality: 5,
    professionalism: 5,
    crowd_engagement: 5,
    sound_quality: 5,
    value_for_money: 5,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDimension = (key: keyof ReviewDimensions, value: number) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
  };

  const overallRating = Math.round(
    (dimensions.punctuality +
      dimensions.professionalism +
      dimensions.crowd_engagement +
      dimensions.sound_quality +
      dimensions.value_for_money) /
      5
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiClient('/v1/reviews', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: bookingId,
          overall_rating: overallRating,
          dimensions: {
            punctuality: dimensions.punctuality,
            professionalism: dimensions.professionalism,
            crowd_engagement: dimensions.crowd_engagement,
            sound_quality: dimensions.sound_quality,
            value_for_money: dimensions.value_for_money,
          },
          comment: comment || undefined,
        }),
      });

      if (res.success) {
        onSubmitSuccess();
      } else {
        setError(res.errors?.[0]?.message ?? 'Failed to submit review');
      }
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-nocturne-info/15 border border-nocturne-info/30 rounded-lg p-4">
        <p className="text-sm text-nocturne-text-primary">
          Help other clients by sharing your experience with this artist. Your feedback is valuable!
        </p>
      </div>

      {error && (
        <div className="bg-nocturne-error/15 border border-nocturne-error/30 rounded-lg p-4">
          <p className="text-sm text-nocturne-error">{error}</p>
        </div>
      )}

      {/* Overall Rating Display */}
      <div className="bg-nocturne-surface-2 rounded-lg p-4 flex items-center justify-between border border-nocturne-border">
        <div>
          <p className="text-sm font-medium text-nocturne-text-primary">Overall Rating</p>
          <p className="text-xs text-nocturne-text-secondary mt-1">Based on all dimensions below</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-nocturne-text-primary">{overallRating}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < overallRating ? 'text-nocturne-gold fill-nocturne-gold' : 'text-nocturne-text-tertiary'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Ratings */}
      <div className="space-y-6">
        {DIMENSIONS.map((dim) => (
          <StarRating
            key={dim.key}
            label={dim.label}
            description={dim.description}
            rating={dimensions[dim.key as keyof ReviewDimensions]}
            onChange={(value) => updateDimension(dim.key as keyof ReviewDimensions, value)}
          />
        ))}
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-nocturne-text-primary mb-2">Additional Comments</label>
        <p className="text-xs text-nocturne-text-secondary mb-2">Share any additional thoughts about your experience</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="What did you like most? Any suggestions for improvement?"
          className="w-full px-3 py-2 bg-nocturne-surface border border-nocturne-border rounded-lg text-sm text-nocturne-text-primary focus:ring-2 focus:ring-nocturne-primary focus:border-nocturne-primary resize-none placeholder-nocturne-text-tertiary"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-nocturne-primary text-nocturne-text-primary rounded-lg font-medium hover:bg-nocturne-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-nocturne-text-primary" />
            Submitting...
          </span>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  );
}
