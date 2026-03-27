'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface SubstitutionCandidate {
  artist_id: string;
  stage_name: string;
  similarity_score: number;
  response_status: 'pending' | 'accepted' | 'declined';
}

interface SubstitutionRequest {
  id: string;
  booking_id: string;
  original_artist_name: string;
  event_type: string;
  event_date: string;
  event_city: string;
  urgency: 'critical' | 'urgent' | 'standard';
  status: 'pending' | 'matching' | 'notified' | 'accepted' | 'expired';
  replacement_artist_name?: string;
  candidates: SubstitutionCandidate[];
  expires_at: string;
  created_at: string;
}

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-[#ff6e84] text-white',
  urgent: 'bg-[#ffbf00] text-white',
  standard: 'bg-[#a1faff] text-white',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-white/10 text-white/60',
  matching: 'bg-[#a1faff]/20 text-[#a1faff]',
  notified: 'bg-[#ffbf00]/20 text-[#ffbf00]',
  accepted: 'bg-[#4ade80]/20 text-[#4ade80]',
  expired: 'bg-[#ff6e84]/20 text-[#ff6e84]',
};

export default function SubstitutionsPage() {
  const [requests, setRequests] = useState<SubstitutionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formBookingId, setFormBookingId] = useState('');
  const [formUrgency, setFormUrgency] = useState<'critical' | 'urgent' | 'standard'>('urgent');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchRequests() {
    setLoading(true);
    apiClient<SubstitutionRequest[]>('/v1/substitutions')
      .then((res) => {
        if (res.success) setRequests(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formBookingId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient<SubstitutionRequest>('/v1/substitutions', {
        method: 'POST',
        body: JSON.stringify({ booking_id: formBookingId.trim(), urgency: formUrgency }),
      });
      if (res.success) {
        setShowForm(false);
        setFormBookingId('');
        setFormUrgency('urgent');
        fetchRequests();
      } else {
        setError((res as { error?: string }).error ?? 'Failed to create request');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up flex-1 mr-4">
          <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Emergency Replacements</h1>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] text-white text-sm font-semibold px-6 py-3 rounded-lg hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] transition-all whitespace-nowrap"
        >
          {showForm ? 'Cancel' : 'Request Replacement'}
        </button>
      </div>

      {/* Emergency Banner */}
      {requests.some((r) => r.urgency === 'critical') && (
        <div className="glass-card border border-[#ff6e84]/30 bg-gradient-to-r from-[#ff6e84]/10 to-transparent rounded-xl p-4 relative z-10 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-[#ff6e84] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#ff6e84]">Critical: You have urgent replacement requests</p>
            <p className="text-xs text-white/60 mt-1">Act quickly to find suitable replacements for your bookings</p>
          </div>
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Booking ID</label>
            <input
              type="text"
              required
              value={formBookingId}
              onChange={(e) => setFormBookingId(e.target.value)}
              placeholder="e.g. bk_abc123"
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Urgency</label>
            <select
              value={formUrgency}
              onChange={(e) => setFormUrgency(e.target.value as 'critical' | 'urgent' | 'standard')}
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
            >
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          {error && <p className="text-sm text-[#ff6e84]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}

      {/* Requests List */}
      <section className="relative z-10">
        <h2 className="text-lg font-display font-semibold text-white mb-3">My Requests</h2>
        {requests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <p className="text-white/40 text-sm">
              No replacement requests. When an artist cancels, you can find a replacement here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">
                      {req.original_artist_name} · {req.event_type}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {req.event_city} · {new Date(req.event_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase border ${URGENCY_COLORS[req.urgency]} border-current/30`}>
                      {req.urgency}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase border ${STATUS_COLORS[req.status]} border-current/30`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {req.status === 'accepted' && req.replacement_artist_name && (
                  <div className="mt-3 bg-[#4ade80]/15 border border-[#4ade80]/30 rounded-lg px-3 py-2">
                    <p className="text-sm text-[#4ade80]">
                      Replacement: <span className="font-semibold">{req.replacement_artist_name}</span>
                    </p>
                  </div>
                )}

                {req.status === 'notified' && req.candidates.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Candidates</p>
                    {req.candidates.map((c) => (
                      <div key={c.artist_id} className="flex items-center justify-between bg-white/5 rounded px-3 py-1.5 border border-white/10">
                        <span className="text-sm text-white">{c.stage_name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-white/40">{c.similarity_score}% match</span>
                          <span
                            className={
                              c.response_status === 'accepted'
                                ? 'text-[#4ade80] font-semibold'
                                : c.response_status === 'declined'
                                  ? 'text-[#ff6e84]'
                                  : 'text-white/40'
                            }
                          >
                            {c.response_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-white/40 mt-3">
                  Expires: {new Date(req.expires_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
