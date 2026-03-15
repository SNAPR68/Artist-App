'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api-client';

interface CancellationModalProps {
  bookingId: string;
  eventDate: string;
  onClose: () => void;
  onCancelled: () => void;
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

export default function CancellationModal({ bookingId, eventDate, onClose, onCancelled }: CancellationModalProps) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<'info' | 'confirm'>('info');

  const daysUntil = getDaysUntilEvent(eventDate);
  const refundPercent = getRefundTier(daysUntil);

  async function handleCancel() {
    setConfirming(true);
    try {
      const res = await apiClient(`/v1/bookings/${bookingId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ to_status: 'cancelled', reason }),
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-700">
                Are you sure? This action cannot be undone.
              </p>
              <p className="text-lg font-bold text-red-800 mt-2">
                Refund: {refundPercent}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
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
