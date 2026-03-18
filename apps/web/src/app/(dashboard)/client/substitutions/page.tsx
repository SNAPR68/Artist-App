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
  critical: 'bg-red-100 text-red-700',
  urgent: 'bg-orange-100 text-orange-700',
  standard: 'bg-blue-100 text-blue-700',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  matching: 'bg-blue-100 text-blue-700',
  notified: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
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
        <h1 className="text-2xl font-bold text-gray-900">Emergency Replacements</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
        >
          {showForm ? 'Cancel' : 'Request Replacement'}
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking ID</label>
            <input
              type="text"
              required
              value={formBookingId}
              onChange={(e) => setFormBookingId(e.target.value)}
              placeholder="e.g. bk_abc123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
            <select
              value={formUrgency}
              onChange={(e) => setFormUrgency(e.target.value as 'critical' | 'urgent' | 'standard')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}

      {/* Requests List */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">My Requests</h2>
        {requests.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">
              No replacement requests. When an artist cancels, you can find a replacement here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {req.original_artist_name} &middot; {req.event_type}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
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
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-green-700">
                      Replacement: <span className="font-medium">{req.replacement_artist_name}</span>
                    </p>
                  </div>
                )}

                {req.status === 'notified' && req.candidates.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Candidates</p>
                    {req.candidates.map((c) => (
                      <div key={c.artist_id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                        <span className="text-sm text-gray-900">{c.stage_name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500">{c.similarity_score}% match</span>
                          <span
                            className={
                              c.response_status === 'accepted'
                                ? 'text-green-600 font-medium'
                                : c.response_status === 'declined'
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            }
                          >
                            {c.response_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
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
