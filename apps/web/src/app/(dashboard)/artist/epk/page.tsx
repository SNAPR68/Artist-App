'use client';

/**
 * Event Company OS pivot (2026-04-22) — EPK Studio.
 *
 * Lets the artist generate + download their Electronic Press Kit (PDF, XLSX,
 * PPTX deck, MP4 reel). Backed by /v1/artists/:id/epk/* endpoints.
 */
import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, Film, Presentation, Download, Sparkles, History } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface EpkArtifact {
  id: string;
  vendor_profile_id: string;
  source: 'generated' | 'uploaded';
  pdf_url: string | null;
  xlsx_url: string | null;
  pptx_url: string | null;
  mp4_url: string | null;
  media_item_count: number | null;
  follower_count_snapshot: number | null;
  ig_username_snapshot: string | null;
  created_at: string;
}

interface Profile { id: string; stage_name: string }

export default function EpkStudioPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latest, setLatest] = useState<EpkArtifact | null>(null);
  const [history, setHistory] = useState<EpkArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [includeReel, setIncludeReel] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await apiClient<Profile>('/v1/artists/profile');
      if (p.success) {
        setProfile(p.data);
        await refresh(p.data.id);
      }
      setLoading(false);
    })();
  }, []);

  const refresh = async (vendorId: string) => {
    const [l, h] = await Promise.all([
      apiClient<EpkArtifact | null>(`/v1/artists/${vendorId}/epk/latest`),
      apiClient<EpkArtifact[]>(`/v1/artists/${vendorId}/epk/history`),
    ]);
    if (l.success) setLatest(l.data);
    if (h.success) setHistory(h.data);
  };

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    setError(null);
    const res = await apiClient<EpkArtifact>(`/v1/artists/${profile.id}/epk/generate`, {
      method: 'POST',
      body: JSON.stringify({ include_reel: includeReel }),
    });
    if (res.success) {
      await refresh(profile.id);
    } else {
      setError(res.errors?.[0]?.message ?? 'Generation failed');
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  const artifacts: Array<{
    key: keyof Pick<EpkArtifact, 'pdf_url' | 'xlsx_url' | 'pptx_url' | 'mp4_url'>;
    label: string;
    blurb: string;
    icon: typeof FileText;
    accent: string;
  }> = [
    { key: 'pdf_url', label: 'Press Kit PDF', blurb: 'Bio, stats, gallery, contact', icon: FileText, accent: '#c39bff' },
    { key: 'xlsx_url', label: 'Stats Sheet', blurb: 'Recent bookings, metrics, pricing', icon: FileSpreadsheet, accent: '#a1faff' },
    { key: 'pptx_url', label: 'Pitch Deck', blurb: 'Cover, bio, stats, gallery, CTA', icon: Presentation, accent: '#ffbf00' },
    { key: 'mp4_url', label: 'Highlight Reel', blurb: '1080p MP4 from your top media', icon: Film, accent: '#c39bff' },
  ];

  return (
    <div className="space-y-6 relative">
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Press & Pitch</span>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white mb-2">EPK Studio</h1>
        <p className="text-white/40 text-lg">
          One click generates a press-ready bundle — PDF, stats sheet, pitch deck, and highlight reel.
        </p>
      </div>

      {/* Generate panel */}
      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden z-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Generate fresh EPK</h2>
            <p className="text-white/50 text-sm">
              Pulls your latest profile, media, Instagram stats, and past bookings into one bundle.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReel}
                onChange={(e) => setIncludeReel(e.target.checked)}
                className="accent-[#c39bff]"
              />
              Include MP4 reel
            </label>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-nocturne-primary inline-flex items-center gap-2 px-6 py-3 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Rendering…' : 'Generate EPK'}
            </button>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-400 relative z-10">{error}</p>}
      </div>

      {/* Latest artifacts */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Your latest EPK</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {artifacts.map(({ key, label, blurb, icon: Icon, accent }) => {
            const url = latest?.[key] ?? null;
            return (
              <div
                key={key}
                className="glass-card rounded-xl p-5 border border-white/5 group hover:border-white/15 transition-all"
              >
                <Icon className="w-8 h-8 mb-3" style={{ color: accent }} />
                <p className="text-white font-semibold">{label}</p>
                <p className="text-white/40 text-xs mb-4">{blurb}</p>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#c39bff] hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                ) : (
                  <span className="text-white/30 text-xs">Not generated yet</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="relative z-10">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-[#a1faff]" />
            History
          </h2>
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
            <table className="nocturne-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Media</th>
                  <th className="text-left px-4 py-3">IG</th>
                  <th className="text-left px-4 py-3">Files</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white/70">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="nocturne-chip">{a.source}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{a.media_item_count ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60">
                      {a.ig_username_snapshot
                        ? `@${a.ig_username_snapshot}${a.follower_count_snapshot ? ` · ${a.follower_count_snapshot.toLocaleString()}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {a.pdf_url && <a className="text-[#c39bff] hover:underline" href={a.pdf_url} target="_blank" rel="noopener noreferrer">PDF</a>}
                      {a.xlsx_url && <a className="text-[#a1faff] hover:underline" href={a.xlsx_url} target="_blank" rel="noopener noreferrer">XLSX</a>}
                      {a.pptx_url && <a className="text-[#ffbf00] hover:underline" href={a.pptx_url} target="_blank" rel="noopener noreferrer">PPTX</a>}
                      {a.mp4_url && <a className="text-[#c39bff] hover:underline" href={a.mp4_url} target="_blank" rel="noopener noreferrer">MP4</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
