'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api-client';

type CancellationSubType = 'BY_CLIENT' | 'BY_ARTIST' | 'FORCE_MAJEURE' | 'PLATFORM';

interface CancellationModalProps {
  bookingId: string;
  eventDate: string;
  onClose: () => void;
  onCancelled: () => void;
  cancellationType?: CancellationSubType;
}

const CANCELLATION_SCHEDULE = [
  { label: '30+ days before event', refund: '100%' },
  { label: '15-29 days before event', refund: '75%' },
  { label: '7-14 days before event', refund: '50%' },
  { label: 'Less than 7 days', refund: '0%' },
];

function getDaysUntilEvent(eventDate: string): number {
  const now = new Date();
  const event = new Date(eventDate);
  return Math.floor((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getRefundTier(days: number): string {
  if (days >= 30) return '100%';
  if (days >= 15) return '75%';
  if (days >= 7) return '50%';
  return '0%';
}

const CANCELLATION_SUBTYPES: { value: CancellationSubType; label: string; description: string }[] = [
  { value: 'BY_CLIENT', label: 'Client Initiated', description: 'I am cancelling this booking' },
  { value: 'BY_ARTIST', label: 'Artist Cancelled', description: 'The artist has cancelled' },
  { value: 'FORCE_MAJEURE', label: 'Force Majeure', description: 'Unforeseen circumstances (emergency, natural disaster)' },
  { value: 'PLATFORM', label: 'Platform Issue', description: 'Technical or administrative issue' },
];

export default function CancellationModal({
  bookingId,
  eventDate,
  onClose,
  onCancelled,
  cancellationType = 'BY_CLIENT'
}: CancellationModalProps) {
  const [reason, setReason] = useState('');
  const [subType, setSubType] = useState<CancellationSubType>(cancellationType);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<'info' | 'type' | 'confirm'>('info');

  const daysUntil = getDaysUntilEvent(eventDate);
  const refundPercent = getRefundTier(daysUntil);

  async function handleCancel() {
    setConfirming(true);
    try {
      const res = await apiClient(`/v1/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          sub_type: subType,
          reason,
        }),
      });
      if (res.success) {
        onCancelled();
      }
    } catch {
      // handled by global error
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-nocturne-text-primary">Cancel Booking</h2>

        {step === 'info' && (
          <>
            <div className="bg-nocturne-warning/15 border border-nocturne-warning/30 rounded-lg p-4">
              <p className="text-sm font-medium text-nocturne-warning mb-1">Refund Policy</p>
              <p className="text-sm text-nocturne-text-secondary mb-3">
                Your event is <strong>{daysUntil} days</strong> away. You are eligible for a <strong>{refundPercent}</strong> refund.
              </p>
              <div className="space-y-1.5">
                {CANCELLATION_SCHEDULE.map((tier) => (
                  <div
                    key={tier.label}
                    className={`flex justify-between text-xs px-2 py-1 rounded ${
                      tier.refund === refundPercent
                        ? 'bg-nocturne-warning/25 font-medium text-nocturne-warning'
                        : 'text-nocturne-text-secondary'
                    }`}
                  >
                    <span>{tier.label}</span>
                    <span>{tier.refund} refund</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-nocturne-text-primary mb-1">Reason for cancellation</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-nocturne-surface border border-nocturne-border rounded-lg p-3 text-sm text-nocturne-text-primary focus:ring-2 focus:ring-nocturne-primary focus:border-nocturne-primary"
                rows={3}
                placeholder="Optional: let us know why..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-nocturne-border text-nocturne-text-primary py-2.5 rounded-lg font-medium hover:bg-nocturne-surface-2 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={() => setStep('type')}
                className="flex-1 bg-nocturne-error text-nocturne-text-primary py-2.5 rounded-lg font-medium hover:bg-nocturne-error/80 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'type' && (
          <>
            <div className="space-y-3">
              <h3 className="font-medium text-nocturne-text-primary">Cancellation Type</h3>
              {CANCELLATION_SUBTYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    subType === type.value
                      ? 'border-nocturne-primary bg-nocturne-primary/15'
                      : 'border-nocturne-border hover:border-nocturne-border/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellation-type"
                    value={type.value}
                    checked={subType === type.value}
                    onChange={(e) => setSubType(e.target.value as CancellationSubType)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-nocturne-text-primary text-sm">{type.label}</p>
                    <p className="text-xs text-nocturne-text-secondary mt-0.5">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 border border-nocturne-border text-nocturne-text-primary py-2.5 rounded-lg font-medium hover:bg-nocturne-surface-2 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-nocturne-error text-nocturne-text-primary py-2.5 rounded-lg font-medium hover:bg-nocturne-error/80 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-nocturne-error/15 border border-nocturne-error/30 rounded-lg p-4">
              <div className="text-center mb-4">
                <p className="text-sm text-nocturne-error font-medium">
                  Are you sure? This action cannot be undone.
                </p>
                <p className="text-lg font-bold text-nocturne-error mt-2">
                  Refund: {refundPercent}
                </p>
              </div>
              <div className="bg-nocturne-error/20 rounded p-3 text-xs text-nocturne-text-primary">
                <p className="font-medium mb-1">Cancellation Type: {CANCELLATION_SUBTYPES.find(t => t.value === subType)?.label}</p>
                {reason && <p>{reason}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('type')}
                className="flex-1 border border-nocturne-border text-nocturne-text-primary py-2.5 rounded-lg font-medium hover:bg-nocturne-surface-2 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={confirming}
                className="flex-1 bg-nocturne-error text-nocturne-text-primary py-2.5 rounded-lg font-medium hover:bg-nocturne-error/80 transition-colors disabled:opacity-50"
              >
                {confirming ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
