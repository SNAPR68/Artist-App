'use client';

import { useEffect, useState } from 'react';
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
  critical: 'bg-red-100 text-nocturne-error',
  urgent: 'bg-orange-100 text-orange-700',
  standard: 'bg-blue-100 text-nocturne-info',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-nocturne-surface text-nocturne-text-secondary',
  matching: 'bg-blue-100 text-nocturne-info',
  notified: 'bg-yellow-100 text-nocturne-warning',
  accepted: 'bg-green-100 text-nocturne-success',
  expired: 'bg-red-100 text-nocturne-error',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up"><div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" /><div className="relative z-10"><h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Emergency Replacements</h1></div></div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-nocturne-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-nocturne-primary transition-colors"
        >
          {showForm ? 'Cancel' : 'Request Replacement'}
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-nocturne-surface border border-white/5 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Booking ID</label>
            <input
              type="text"
              required
              value={formBookingId}
              onChange={(e) => setFormBookingId(e.target.value)}
              placeholder="e.g. bk_abc123"
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Urgency</label>
            <select
              value={formUrgency}
              onChange={(e) => setFormUrgency(e.target.value as 'critical' | 'urgent' | 'standard')}
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          {error && <p className="text-sm text-nocturne-error">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-nocturne-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-nocturne-primary transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}

      {/* Requests List */}
      <section>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-3">My Requests</h2>
        {requests.length === 0 ? (
          <div className="bg-nocturne-base border border-white/5 rounded-lg p-6 text-center">
            <p className="text-nocturne-text-tertiary text-sm">
              No replacement requests. When an artist cancels, you can find a replacement here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-nocturne-surface border border-white/5 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-nocturne-text-primary text-sm">
                      {req.original_artist_name} &middot; {req.event_type}
                    </p>
                    <p className="text-xs text-nocturne-text-tertiary mt-0.5">
                      {req.event_city} &middot;{' '}
                      {new Date(req.event_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${URGENCY_COLORS[req.urgency]}`}>
                      {req.urgency}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {req.status === 'accepted' && req.replacement_artist_name && (
                  <div className="mt-3 bg-nocturne-success/15 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-nocturne-success">
                      Replacement: <span className="font-medium">{req.replacement_artist_name}</span>
                    </p>
                  </div>
                )}

                {req.status === 'notified' && req.candidates.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-nocturne-text-tertiary uppercase tracking-wide">Candidates</p>
                    {req.candidates.map((c) => (
                      <div key={c.artist_id} className="flex items-center justify-between bg-nocturne-base rounded px-3 py-1.5">
                        <span className="text-sm text-nocturne-text-primary">{c.stage_name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-nocturne-text-tertiary">{c.similarity_score}% match</span>
                          <span
                            className={
                              c.response_status === 'accepted'
                                ? 'text-nocturne-success font-medium'
                                : c.response_status === 'declined'
                                  ? 'text-nocturne-error'
                                  : 'text-nocturne-text-tertiary'
                            }
                          >
                            {c.response_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-nocturne-text-tertiary mt-3">
                  Expires:{' '}
                  {new Date(req.expires_at).toLocaleString('en-IN', {
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
