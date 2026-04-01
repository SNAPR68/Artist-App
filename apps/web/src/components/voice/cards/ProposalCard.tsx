'use client';

import type { VoiceProposalCard } from '@artist-booking/shared';

export function ProposalCard({ proposal, onGenerate }: { proposal: VoiceProposalCard; onGenerate?: (briefId: string) => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a191b]/80 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-[#c39bff]/20 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#c39bff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        </div>
        <h4 className="text-sm font-medium text-white">Proposal Ready</h4>
      </div>

      <p className="text-[11px] text-white/40 mb-3 leading-relaxed">{proposal.summary}</p>

      {/* Artists list */}
      <div className="space-y-1.5 mb-3">
        {proposal.artists.map((a) => (
          <div key={a.id} className="flex items-center justify-between text-[11px]">
            <span className="text-white/60">{a.name}</span>
            <span className="text-white/30">{a.price_range}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      {proposal.total_estimate_paise && (
        <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2 mb-3">
          <span className="text-white/40">Estimated Total</span>
          <span className="text-white font-medium">₹{(proposal.total_estimate_paise / 100).toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* CTA */}
      {onGenerate && (
        <button
          onClick={() => onGenerate(proposal.brief_id)}
          className="w-full text-center text-[11px] font-medium text-[#c39bff] hover:bg-[#c39bff]/10 py-2 rounded-lg border border-[#c39bff]/20 transition-colors"
        >
          Generate PDF Proposal
        </button>
      )}
    </div>
  );
}
