'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createBrief,
  generateProposal,
  lockAvailability,
  type DecisionRecommendation,
  type DecisionResponse,
} from '@/lib/api/decision-engine';
import { analytics } from '@/lib/analytics';
import VoiceFillButton from '@/components/voice/VoiceFillButton';
import ClientDetailsModal from '@/components/proposal/ClientDetailsModal';

const BRIEF_FORM_CONTEXT = {
  page: 'event brief form',
  fields: [
    { name: 'event_type', label: 'Event type', type: 'select' as const, options: ['wedding', 'wedding_sangeet', 'wedding_reception', 'corporate', 'college_fest', 'birthday', 'house_party', 'concert'] },
    { name: 'city', label: 'City', type: 'text' as const },
    { name: 'event_date', label: 'Event date', type: 'date' as const },
    { name: 'budget_max', label: 'Max budget in rupees', type: 'number' as const },
    { name: 'genres', label: 'Music genres (comma separated)', type: 'text' as const },
    { name: 'rawText', label: 'Event description', type: 'text' as const },
  ],
};

// ─── Main Page ──────────────────────────────────────────────

type PageState = 'idle' | 'submitting' | 'results' | 'proposing' | 'locking';

type ProposalResult = { presentation_web_url?: string } | null;

export default function BriefPageClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [rawText, setRawText] = useState(initialQuery);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [fields, setFields] = useState({
    event_type: '',
    city: '',
    event_date: '',
    budget_max: '',
    genres: '',
  });
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (rawText.trim().length < 5) return;
    setError(null);
    setSuccessMessage(null);
    setState('submitting');
    analytics.trackEvent('brief_created', {
      source: 'web',
      has_structured_fields: Boolean(fields.event_type || fields.city || fields.event_date || fields.budget_max || fields.genres),
    });

    const input: Record<string, unknown> = {
      raw_text: rawText,
      source: 'web',
    };
    if (fields.event_type) input.event_type = fields.event_type;
    if (fields.city) input.city = fields.city;
    if (fields.event_date) input.event_date = fields.event_date;
    if (fields.budget_max) input.budget_max_paise = Number(fields.budget_max) * 100;
    if (fields.genres) input.genres = fields.genres.split(',').map((g) => g.trim()).filter(Boolean);

    const res = await createBrief(input as Parameters<typeof createBrief>[0]);

    if (res.success && res.data) {
      setResult(res.data);
      setSelectedIds(new Set());
      setState('results');
      analytics.trackEvent('recommendation_returned', {
        brief_id: res.data.brief_id,
        recommendations_count: res.data.recommendations?.length ?? 0,
        source: 'web',
      });
    } else {
      setError(res.errors?.[0]?.message ?? 'Something went wrong');
      setState('idle');
      analytics.trackEvent('brief_parse_failed', {
        source: 'web',
        error: res.errors?.[0]?.message ?? 'unknown',
      });
    }
  }, [rawText, fields]);

  // Auto-submit when arriving from homepage with ?q= param
  useEffect(() => {
    if (initialQuery && !autoSubmitted && state === 'idle') {
      setAutoSubmitted(true);
      handleSubmit();
    }
  }, [initialQuery, autoSubmitted, state, handleSubmit]);

  const handleToggleSelect = useCallback((artistId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });
  }, []);

  const handleProposal = useCallback(async (clientDetails?: {
    contact_name: string;
    contact_email: string;
    client_notes: string;
    include_pricing: boolean;
  }) => {
    if (!result || selectedIds.size === 0) return;
    setShowClientModal(false);
    setState('proposing');
    const res = await generateProposal(result.brief_id, {
      artist_ids: Array.from(selectedIds),
      include_pricing: clientDetails?.include_pricing ?? false,
      contact_name: clientDetails?.contact_name || undefined,
      contact_email: clientDetails?.contact_email || undefined,
      client_notes: clientDetails?.client_notes || undefined,
    });
    if (res.success) {
      const webUrl = ((res.data as ProposalResult)?.presentation_web_url) ?? null;
      setSuccessMessage(
        webUrl
          ? `Proposal generated! View it here: ${webUrl}`
          : 'Proposal generated! Check your dashboard for the full document.',
      );
      analytics.trackEvent('proposal_generated', {
        brief_id: result.brief_id,
        artist_count: selectedIds.size,
        source: 'web',
      });
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to generate proposal. Please log in and try again.');
      analytics.trackEvent('proposal_generate_failed', {
        brief_id: result.brief_id,
        source: 'web',
        error: res.errors?.[0]?.message ?? 'unknown',
      });
    }
    setState('results');
  }, [result, selectedIds]);

  const handleLock = useCallback(async () => {
    if (!result || selectedIds.size !== 1) return;
    setState('locking');
    const artistId = Array.from(selectedIds)[0];
    const res = await lockAvailability(result.brief_id, { artist_id: artistId });
    if (res.success && res.data) {
      setSuccessMessage(res.data.message);
      analytics.trackEvent('lock_requested', {
        brief_id: result.brief_id,
        artist_id: artistId,
        booking_id: res.data.booking_id,
        source: 'web',
      });
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to lock availability. Please log in and try again.');
      analytics.trackEvent('lock_request_failed', {
        brief_id: result.brief_id,
        artist_id: artistId,
        source: 'web',
        error: res.errors?.[0]?.message ?? 'unknown',
      });
    }
    setState('results');
  }, [result, selectedIds]);

  return (
    <div className="min-h-screen text-white font-sans pb-32">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#c39bff]/8 blur-[180px] rounded-full" />
        <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-[#a1faff]/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-12 pb-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c39bff]/10 border border-[#c39bff]/20 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c39bff] animate-pulse" />
            <span className="text-[#c39bff] text-xs font-bold uppercase tracking-widest">Decision Engine</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tighter text-white mb-3">
            What should you <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c39bff] to-[#a1faff]">book?</span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Describe your event and get ranked artist recommendations with pricing, fit scores, and risk flags.
          </p>
        </div>

        {/* Brief Input */}
        <div className="glass-card rounded-xl p-6 md:p-8 border border-white/5 relative overflow-hidden mb-6">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. Delhi wedding, 300 guests, 5 lakh budget, need a Punjabi singer for sangeet night..."
            className="w-full bg-transparent text-white placeholder:text-white/30 text-lg font-display resize-none border-0 outline-none min-h-[120px] relative z-10"
            disabled={state === 'submitting'}
          />
          <div className="flex items-center justify-between mt-4 relative z-10">
            <button
              type="button"
              onClick={() => setShowFields(!showFields)}
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              {showFields ? '− Hide details' : '+ Add details'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={rawText.trim().length < 5 || state === 'submitting'}
              className="px-6 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {state === 'submitting' ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Get Recommendations'
              )}
            </button>
          </div>
        </div>

        {/* Optional Structured Fields */}
        {showFields && (
          <div className="glass-card rounded-xl p-6 border border-white/5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1 block">Event Type</label>
                <select
                  value={fields.event_type}
                  onChange={(e) => setFields((f) => ({ ...f, event_type: e.target.value }))}
                  className="input-nocturne w-full"
                >
                  <option value="">Auto-detect</option>
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate</option>
                  <option value="private_party">Private Party</option>
                  <option value="concert">Concert</option>
                  <option value="club_gig">Club Gig</option>
                  <option value="festival">Festival</option>
                  <option value="college_event">College Event</option>
                  <option value="restaurant">Restaurant</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1 block">City</label>
                <input
                  type="text"
                  value={fields.city}
                  onChange={(e) => setFields((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                  className="input-nocturne w-full"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1 block">Event Date</label>
                <input
                  type="date"
                  value={fields.event_date}
                  onChange={(e) => setFields((f) => ({ ...f, event_date: e.target.value }))}
                  className="input-nocturne w-full"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1 block">Max Budget (INR)</label>
                <input
                  type="number"
                  value={fields.budget_max}
                  onChange={(e) => setFields((f) => ({ ...f, budget_max: e.target.value }))}
                  placeholder="e.g. 500000"
                  className="input-nocturne w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1 block">Genres (comma separated)</label>
                <input
                  type="text"
                  value={fields.genres}
                  onChange={(e) => setFields((f) => ({ ...f, genres: e.target.value }))}
                  placeholder="e.g. bollywood, sufi, punjabi"
                  className="input-nocturne w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card rounded-xl p-4 border border-red-500/20 mb-6 flex items-center gap-3">
            <span className="text-red-400 text-sm">&#9888;</span>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="glass-card rounded-xl p-4 border border-green-500/20 mb-6 flex items-center gap-3">
            <span className="text-green-400 text-sm">&#10003;</span>
            <p className="text-green-300 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Results */}
        {state !== 'idle' && state !== 'submitting' && result && (
          <>
            {/* Summary */}
            <div className="glass-card rounded-xl p-6 border border-white/5 mb-6 relative overflow-hidden">
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#a1faff]/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-xs text-[#a1faff] uppercase tracking-widest font-bold mb-2">Brief Interpreted</h2>
                <p className="text-white text-lg font-display font-bold">{result.summary}</p>
                {result.constraints_note && (
                  <p className="text-[#ffbf00]/80 text-sm mt-2">{result.constraints_note}</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length === 0 ? (
              <div className="glass-card rounded-xl p-8 border border-white/5 text-center">
                <p className="text-white/50 text-lg">No matching artists found. Try broadening your brief.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs text-white/40 uppercase tracking-widest font-bold">
                  Top {result.recommendations.length} Recommendations
                </h3>
                {result.recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    isSelected={selectedIds.has(rec.artist_id)}
                    onToggle={() => handleToggleSelect(rec.artist_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky Action Bar */}
      {result && selectedIds.size > 0 && (state === 'results' || state === 'proposing' || state === 'locking') && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0e0e0f]/95 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="text-sm text-white/50">
              {selectedIds.size} artist{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                disabled={state === 'proposing' || state === 'locking'}
                className="px-5 py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {state === 'proposing' ? 'Generating...' : 'Send Proposal'}
              </button>
              {selectedIds.size === 1 && (
                <button
                  type="button"
                  onClick={handleLock}
                  disabled={state === 'proposing' || state === 'locking'}
                  className="px-5 py-2 rounded-lg font-bold text-sm border border-[#a1faff]/30 text-[#a1faff] hover:bg-[#a1faff]/10 disabled:opacity-40 transition-all"
                >
                  {state === 'locking' ? 'Locking...' : 'Lock Availability'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client details modal — shown before proposal generation */}
      {showClientModal && result && (
        <ClientDetailsModal
          artistCount={selectedIds.size}
          onConfirm={(details) => handleProposal(details)}
          onCancel={() => setShowClientModal(false)}
        />
      )}

      {/* Voice form-fill — only show on idle/input state */}
      {state === 'idle' && (
        <VoiceFillButton
          formContext={BRIEF_FORM_CONTEXT}
          onFieldUpdate={(updated) => {
            if (updated.rawText) setRawText(updated.rawText);
            setFields((prev) => ({
              ...prev,
              ...(updated.event_type ? { event_type: updated.event_type } : {}),
              ...(updated.city ? { city: updated.city } : {}),
              ...(updated.event_date ? { event_date: updated.event_date } : {}),
              ...(updated.budget_max ? { budget_max: updated.budget_max } : {}),
              ...(updated.genres ? { genres: updated.genres } : {}),
            }));
          }}
        />
      )}
    </div>
  );
}

// ─── Recommendation Card ────────────────────────────────────

function RecommendationCard({
  rec,
  isSelected,
  onToggle,
}: {
  rec: DecisionRecommendation;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const formatINR = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

  return (
    <div
      className={`glass-card rounded-xl p-5 border transition-all cursor-pointer ${
        isSelected ? 'border-[#c39bff]/40 bg-[#c39bff]/5' : 'border-white/5 hover:border-white/10'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#c39bff]/20 to-[#8A2BE2]/20 border border-[#c39bff]/20 flex items-center justify-center">
          <span className="text-[#c39bff] font-bold text-sm">#{rec.rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-white font-display font-bold text-lg truncate">{rec.artist_name}</h4>
              <span className="text-white/40 text-xs uppercase tracking-wider">{rec.artist_type}</span>
            </div>
            <ConfidenceBadge confidence={rec.confidence} />
          </div>

          {/* Price Range */}
          <div className="mb-3">
            <span className="text-[#a1faff] font-bold text-lg">
              {formatINR(rec.price_min_paise)}
              {rec.price_max_paise !== rec.price_min_paise && ` – ${formatINR(rec.price_max_paise)}`}
            </span>
            {rec.expected_close_paise && (
              <span className="text-white/30 text-sm ml-2">
                ~{formatINR(rec.expected_close_paise)} expected
              </span>
            )}
          </div>

          {/* Why Fit */}
          {rec.why_fit.length > 0 && (
            <div className="space-y-1 mb-2">
              {rec.why_fit.map((reason, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-green-400 text-xs">&#10003;</span>
                  <span className="text-white/60 text-sm">{reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Risk Flags */}
          {rec.risk_flags.length > 0 && (
            <div className="space-y-1 mb-2">
              {rec.risk_flags.map((flag, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[#ffbf00] text-xs">&#9888;</span>
                  <span className="text-white/50 text-sm">{flag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Logistics Flags */}
          {rec.logistics_flags.length > 0 && (
            <div className="space-y-1">
              {rec.logistics_flags.map((flag, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-white/30 text-xs">&#128205;</span>
                  <span className="text-white/40 text-sm">{flag}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selection indicator */}
        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isSelected ? 'border-[#c39bff] bg-[#c39bff]' : 'border-white/20'
        }`}>
          {isSelected && <span className="text-white text-xs font-bold">&#10003;</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Confidence Badge ───────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let label: string;
  let colorClass: string;

  if (confidence >= 0.8) {
    label = 'High confidence';
    colorClass = 'bg-[#ffbf00]/15 text-[#ffbf00] border-[#ffbf00]/20';
  } else if (confidence >= 0.5) {
    label = 'Good fit';
    colorClass = 'bg-[#a1faff]/10 text-[#a1faff] border-[#a1faff]/20';
  } else {
    label = 'Possible fit';
    colorClass = 'bg-white/5 text-white/40 border-white/10';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
      {label}
    </span>
  );
}
