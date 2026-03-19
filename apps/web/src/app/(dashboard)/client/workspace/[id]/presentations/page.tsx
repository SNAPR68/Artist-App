'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Types ──────────────────────────────────────────────────────

interface Presentation {
  id: string;
  title: string;
  slug: string;
  artist_ids: string[];
  include_pricing: boolean;
  include_media: boolean;
  view_count: number;
  expires_at: string | null;
  created_at: string;
}

interface PipelineArtist {
  id: string;
  artist_id: string;
  artist_name: string;
}

interface CreateFormData {
  title: string;
  artist_ids: string[];
  notes_per_artist: Record<string, string>;
  include_pricing: boolean;
  include_media: boolean;
  custom_header: string;
  custom_footer: string;
  expires_at: string;
}

// ─── Component ──────────────────────────────────────────────────

export default function WorkspacePresentationsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [artists, setArtists] = useState<PipelineArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateFormData>({
    title: '',
    artist_ids: [],
    notes_per_artist: {},
    include_pricing: false,
    include_media: false,
    custom_header: '',
    custom_footer: '',
    expires_at: '',
  });

  // ─── Data Fetching ──────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      apiClient<Presentation[]>(`/v1/workspaces/${workspaceId}/presentations`),
      apiClient<PipelineArtist[]>(`/v1/workspaces/${workspaceId}/pipeline`),
    ])
      .then(([presRes, pipeRes]) => {
        if (presRes.success) setPresentations(presRes.data);
        if (pipeRes.success) {
          // Deduplicate artists from pipeline bookings
          const seen = new Set<string>();
          const unique: PipelineArtist[] = [];
          for (const booking of pipeRes.data) {
            const aid = (booking as unknown as Record<string, unknown>).artist_id as string ??
              (booking as unknown as Record<string, unknown>).id as string;
            const name = (booking as unknown as Record<string, unknown>).artist_name as string ?? 'Unknown Artist';
            if (aid && !seen.has(aid)) {
              seen.add(aid);
              unique.push({ id: aid, artist_id: aid, artist_name: name });
            }
          }
          setArtists(unique);
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // ─── Handlers ───────────────────────────────────────────────

  function toggleArtist(artistId: string) {
    setForm((prev) => {
      const selected = prev.artist_ids.includes(artistId);
      const newIds = selected
        ? prev.artist_ids.filter((id) => id !== artistId)
        : [...prev.artist_ids, artistId];

      const newNotes = { ...prev.notes_per_artist };
      if (selected) delete newNotes[artistId];

      return { ...prev, artist_ids: newIds, notes_per_artist: newNotes };
    });
  }

  function updateNote(artistId: string, note: string) {
    setForm((prev) => ({
      ...prev,
      notes_per_artist: { ...prev.notes_per_artist, [artistId]: note },
    }));
  }

  async function handleCreate() {
    if (!form.title.trim() || form.artist_ids.length === 0) return;

    setCreating(true);
    try {
      // Clean notes — only include non-empty values
      const cleanNotes: Record<string, string> = {};
      for (const [id, note] of Object.entries(form.notes_per_artist)) {
        if (note.trim()) cleanNotes[id] = note.trim();
      }

      const body: Record<string, unknown> = {
        title: form.title.trim(),
        artist_ids: form.artist_ids,
        include_pricing: form.include_pricing,
        include_media: form.include_media,
      };

      if (Object.keys(cleanNotes).length > 0) body.notes_per_artist = cleanNotes;
      if (form.custom_header.trim()) body.custom_header = form.custom_header.trim();
      if (form.custom_footer.trim()) body.custom_footer = form.custom_footer.trim();
      if (form.expires_at) body.expires_at = form.expires_at;

      const res = await apiClient<Presentation>(`/v1/workspaces/${workspaceId}/presentations`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success) {
        setPresentations((prev) => [res.data, ...prev]);
        setForm({
          title: '',
          artist_ids: [],
          notes_per_artist: {},
          include_pricing: false,
          include_media: false,
          custom_header: '',
          custom_footer: '',
          expires_at: '',
        });
        setShowForm(false);
      } else {
        setError(res.errors?.[0]?.message ?? 'Failed to create presentation');
      }
    } catch {
      setError('Failed to create presentation');
    } finally {
      setCreating(false);
    }
  }

  function copyLink(slug: string, presentationId: string) {
    const url = `${window.location.origin}/presentations/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(presentationId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function getPublicUrl(slug: string): string {
    return `/presentations/${slug}`;
  }

  // ─── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/client/workspace/${workspaceId}`}
            className="text-sm text-primary-500 hover:underline"
          >
            &larr; Back to Workspace
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Presentations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create branded artist lineups to share with your clients
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          {showForm ? 'Cancel' : 'Create Presentation'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* ── Create Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">New Presentation</h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Artist Lineup for Wedding Reception"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Select Artists */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Artists * ({form.artist_ids.length} selected)
            </label>
            {artists.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                No artists found in workspace pipeline. Add bookings first.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {artists.map((a) => {
                  const isSelected = form.artist_ids.includes(a.artist_id);
                  return (
                    <div key={a.artist_id}>
                      <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleArtist(a.artist_id)}
                          className="h-4 w-4 text-primary-500 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{a.artist_name}</span>
                      </label>

                      {/* Notes for selected artist */}
                      {isSelected && (
                        <div className="ml-9 mt-1 mb-2">
                          <textarea
                            value={form.notes_per_artist[a.artist_id] ?? ''}
                            onChange={(e) => updateNote(a.artist_id, e.target.value)}
                            placeholder={`Note about ${a.artist_name} (optional)`}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.include_pricing}
                onChange={(e) => setForm({ ...form, include_pricing: e.target.checked })}
                className="h-4 w-4 text-primary-500 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Include Pricing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.include_media}
                onChange={(e) => setForm({ ...form, include_media: e.target.checked })}
                className="h-4 w-4 text-primary-500 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Include Media</span>
            </label>
          </div>

          {/* Optional Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Header Text</label>
            <textarea
              value={form.custom_header}
              onChange={(e) => setForm({ ...form, custom_header: e.target.value })}
              placeholder="Introductory message shown at the top of the presentation"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Footer Text</label>
            <textarea
              value={form.custom_footer}
              onChange={(e) => setForm({ ...form, custom_footer: e.target.value })}
              placeholder="Closing message or terms shown at the bottom"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.title.trim() || form.artist_ids.length === 0}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Presentation'}
            </button>
          </div>
        </div>
      )}

      {/* ── Presentations List ───────────────────────────────── */}
      {presentations.length === 0 && !showForm ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 mb-1">No presentations yet</p>
          <p className="text-sm text-gray-400">
            Create a branded artist lineup to share with your clients.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {presentations.map((pres) => {
            const artistCount = Array.isArray(pres.artist_ids)
              ? pres.artist_ids.length
              : typeof pres.artist_ids === 'string'
                ? JSON.parse(pres.artist_ids).length
                : 0;

            const isExpired = pres.expires_at && new Date(pres.expires_at) < new Date();

            return (
              <div
                key={pres.id}
                className={`bg-white border rounded-lg p-4 ${isExpired ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{pres.title}</h3>
                      {isExpired && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{artistCount} artist{artistCount !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {pres.view_count ?? 0} views
                      </span>
                      <span>
                        Created {new Date(pres.created_at).toLocaleDateString('en-IN')}
                      </span>
                      {pres.expires_at && (
                        <span>
                          Expires {new Date(pres.expires_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyLink(pres.slug, pres.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        copiedId === pres.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {copiedId === pres.id ? 'Copied!' : 'Copy Link'}
                    </button>
                    <a
                      href={`${API_BASE_URL}/v1/presentations/${pres.slug}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </a>
                    <a
                      href={getPublicUrl(pres.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100 transition-colors"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
