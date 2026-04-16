'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Lock, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { apiClient } from '../../../../../../lib/api-client';

interface DecisionBriefRow {
  id: string;
  source: string;
  status: string;
  created_at: string;
  owner_phone: string | null;
  summary: string;
  recommendations_count: number;
  proposal_generated: boolean;
  presentation_slug: string | null;
  lock_requested: boolean;
  booking_id: string | null;
}

type FilterKey = 'all' | 'proposal_sent' | 'locked';

export default function WorkspaceDecisionBriefsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [briefs, setBriefs] = useState<DecisionBriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient<DecisionBriefRow[]>(`/v1/workspaces/${workspaceId}/decision-briefs`)
      .then((res) => {
        if (res.success) setBriefs(res.data || []);
        else setError(res.errors?.[0]?.message ?? 'Failed to load decision briefs');
      })
      .catch(() => setError('Failed to load decision briefs'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const filtered = useMemo(() => {
    if (filter === 'proposal_sent') return briefs.filter((b) => b.proposal_generated);
    if (filter === 'locked') return briefs.filter((b) => b.lock_requested);
    return briefs;
  }, [briefs, filter]);

  const filterOptions: Array<{ key: FilterKey; label: string; count: number }> = useMemo(() => ([
    { key: 'all', label: 'All', count: briefs.length },
    { key: 'proposal_sent', label: 'Proposal sent', count: briefs.filter((b) => b.proposal_generated).length },
    { key: 'locked', label: 'Locked', count: briefs.filter((b) => b.lock_requested).length },
  ]), [briefs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="flex items-start justify-between gap-6">
        <div>
          <Link
            href={`/client/workspace/${workspaceId}`}
            className="text-[10px] font-bold text-[#a1faff] hover:text-[#c39bff] uppercase tracking-widest"
          >
            &larr; Back to Workspace
          </Link>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white mt-3">
            Decision Briefs
          </h1>
          <p className="text-white/50 text-sm mt-2">
            Briefs created through the decision engine — track proposals and locks in one place.
          </p>
        </div>

        <Link
          href="/brief"
          className="glass-card px-6 py-3 rounded-xl text-sm font-bold text-[#c39bff] border border-[#c39bff]/30 bg-[#c39bff]/5 hover:bg-[#c39bff]/15 transition-all flex items-center gap-2 shrink-0"
        >
          <Sparkles size={16} />
          New brief
        </Link>
      </div>

      {error && (
        <div className="glass-card border border-red-500/20 bg-red-500/5 rounded-2xl p-6 text-red-200">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
              filter === opt.key
                ? 'bg-[#c39bff]/15 border-[#c39bff]/30 text-[#c39bff]'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:bg-white/10'
            }`}
          >
            {opt.label} <span className="text-white/30">({opt.count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card border border-white/10 rounded-2xl p-14 text-center">
          <FileText size={56} className="mx-auto mb-6 text-[#a1faff]/40" />
          <h3 className="text-xl font-display font-bold text-white mb-3">No decision briefs yet</h3>
          <p className="text-white/50 mb-6">Create a brief and we’ll generate ranked recommendations instantly.</p>
          <Link href="/brief" className="text-[#c39bff] text-sm font-bold hover:text-[#a1faff] transition-colors">
            Create your first brief →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1faff]">{b.source}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    {new Date(b.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-white font-semibold truncate">{b.summary}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                    {b.recommendations_count} recs
                  </span>
                  {b.proposal_generated && (
                    <span className="px-2.5 py-1 rounded-full bg-[#c39bff]/10 border border-[#c39bff]/20 text-[#c39bff]">
                      Proposal
                    </span>
                  )}
                  {b.lock_requested && (
                    <span className="px-2.5 py-1 rounded-full bg-[#a1faff]/10 border border-[#a1faff]/20 text-[#a1faff] inline-flex items-center gap-1">
                      <Lock size={12} /> Locked
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {b.presentation_slug && (
                  <Link
                    href={`/presentations/${b.presentation_slug}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 transition-all inline-flex items-center gap-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Proposal <ExternalLink size={14} />
                  </Link>
                )}

                {b.booking_id && (
                  <Link
                    href={`/client/bookings/${b.booking_id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 transition-all inline-flex items-center gap-2"
                  >
                    Booking <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

