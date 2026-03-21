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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>

        {step === 'info' && (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-1">Refund Policy</p>
              <p className="text-sm text-yellow-700 mb-3">
                Your event is <strong>{daysUntil} days</strong> away. You are eligible for a <strong>{refundPercent}</strong> refund.
              </p>
              <div className="space-y-1.5">
                {CANCELLATION_SCHEDULE.map((tier) => (
                  <div
                    key={tier.label}
                    className={`flex justify-between text-xs px-2 py-1 rounded ${
                      tier.refund === refundPercent
                        ? 'bg-yellow-200 font-medium text-yellow-900'
                        : 'text-yellow-700'
                    }`}
                  >
                    <span>{tier.label}</span>
                    <span>{tier.refund} refund</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Optional: let us know why..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={() => setStep('type')}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'type' && (
          <>
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Cancellation Type</h3>
              {CANCELLATION_SUBTYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    subType === type.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
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
                    <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-center mb-4">
                <p className="text-sm text-red-700 font-medium">
                  Are you sure? This action cannot be undone.
                </p>
                <p className="text-lg font-bold text-red-800 mt-2">
                  Refund: {refundPercent}
                </p>
              </div>
              <div className="bg-red-100 rounded p-3 text-xs text-red-700">
                <p className="font-medium mb-1">Cancellation Type: {CANCELLATION_SUBTYPES.find(t => t.value === subType)?.label}</p>
                {reason && <p>{reason}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('type')}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={confirming}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
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
