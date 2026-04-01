'use client';

import type { VoiceConfirmationCard } from '@artist-booking/shared';

export function ConfirmationCard({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: VoiceConfirmationCard;
  onConfirm?: (payload?: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a191b]/80 backdrop-blur-sm p-4">
      <p className="text-xs text-white/60 mb-3 leading-relaxed">{confirmation.description}</p>

      <div className="flex gap-2">
        <button
          onClick={() => onConfirm?.(confirmation.payload)}
          className="flex-1 text-[11px] font-medium text-white bg-[#c39bff] hover:bg-[#b48af0] py-2 rounded-lg transition-colors"
        >
          {confirmation.confirm_label}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 text-[11px] font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 py-2 rounded-lg transition-colors"
        >
          {confirmation.cancel_label}
        </button>
      </div>
    </div>
  );
}
