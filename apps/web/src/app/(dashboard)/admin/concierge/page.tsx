'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Users, TrendingUp, Briefcase, Phone, Inbox, Check, X, Play, AlertTriangle, Clock } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface ConciergeStats {
  total_concierge_bookings: number;
  open_inquiries: number;
  this_week_bookings: number;
  conversion_rate_pct?: number;
  revenue_this_month_paise?: number;
}

interface ArtistHit {
  id: string;
  stage_name: string;
  artist_type?: string;
  base_city?: string;
  trust_score?: number;
  base_fee_paise?: number;
}

type ReqStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
type SlaFilter = 'all' | 'breaching' | 'pending' | 'active';

interface SlaMetrics {
  pending_count: number;
  breaching_24h: number;
  breaching_48h: number;
  active_count: number;
  avg_accept_hours: number | null;
  avg_resolve_hours: number | null;
  completed_7d: number;
}

interface ConciergeReq {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  requester_phone?: string;
  topic: string;
  notes: string;
  event_date?: string | null;
  budget_paise?: number | null;
  status: ReqStatus;
  assigned_to?: string | null;
  created_at: string;
}

const TOPIC_LABELS: Record<string, string> = {
  deal_help: 'Deal help',
  artist_sourcing: 'Artist sourcing',
  negotiation: 'Negotiation',
  compliance: 'Compliance',
  other: 'Other',
};

export default function ConciergePage() {
  const [stats, setStats] = useState<ConciergeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ArtistHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<ConciergeReq[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [patching, setPatching] = useState<string | null>(null);
  const [sla, setSla] = useState<SlaMetrics | null>(null);
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('all');

  const loadStats = useCallback(async () => {
    const res = await apiClient<ConciergeStats>('/v1/concierge/stats');
    if (res.success) setStats(res.data);
    setLoading(false);
  }, []);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    const [reqRes, slaRes] = await Promise.all([
      apiClient<ConciergeReq[]>('/v1/admin/concierge/requests'),
      apiClient<SlaMetrics>('/v1/admin/concierge/sla').catch(() => ({ success: false } as const)),
    ]);
    if (reqRes.success && Array.isArray(reqRes.data)) setRequests(reqRes.data);
    if (slaRes.success) setSla(slaRes.data);
    setReqLoading(false);
  }, []);

  useEffect(() => { loadStats(); loadRequests(); }, [loadStats, loadRequests]);

  const filteredRequests = requests.filter((r) => {
    if (slaFilter === 'all') return true;
    if (slaFilter === 'pending') return r.status === 'pending';
    if (slaFilter === 'active') return r.status === 'accepted' || r.status === 'in_progress';
    if (slaFilter === 'breaching') {
      const ageHours = (Date.now() - new Date(r.created_at).getTime()) / 3_600_000;
      return r.status === 'pending' && ageHours >= 48;
    }
    return true;
  });

  const patchReq = async (id: string, status: ReqStatus, resolution_notes?: string) => {
    setPatching(id);
    const res = await apiClient<ConciergeReq>(`/v1/admin/concierge/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes }),
    });
    setPatching(null);
    if (res.success) loadRequests();
  };

  const doSearch = async () => {
    setSearching(true); setError(null);
    const res = await apiClient<ArtistHit[]>('/v1/concierge/search', {
      method: 'POST',
      body: JSON.stringify({
        q: query || undefined,
        city: city || undefined,
        budget_max_paise: budget ? Number(budget) * 100 : undefined,
      }),
    });
    if (res.success && Array.isArray(res.data)) setResults(res.data);
    else setError(res.errors?.[0]?.message ?? 'Search failed');
    setSearching(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <header>
        <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Internal</p>
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white">Concierge Console</h1>
        <p className="text-white/50 text-sm mt-1">Search artists, create bookings, manage client pipelines on behalf of planners.</p>
      </header>

      {/* Stats */}
      {loading ? (
        <div className="text-white/40 text-sm">Loading stats…</div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Briefcase} label="Total bookings" value={String(stats.total_concierge_bookings ?? 0)} />
          <StatCard icon={Phone} label="Open inquiries" value={String(stats.open_inquiries ?? 0)} />
          <StatCard icon={TrendingUp} label="This week" value={String(stats.this_week_bookings ?? 0)} />
          <StatCard icon={Users} label="Conversion"
            value={stats.conversion_rate_pct != null ? `${stats.conversion_rate_pct.toFixed(0)}%` : '—'} />
        </div>
      )}

      {/* SLA Metrics */}
      {sla && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={AlertTriangle}
            label="Breaching >48h"
            value={String(sla.breaching_48h)}
            tone={sla.breaching_48h > 0 ? 'danger' : 'default'}
          />
          <StatCard
            icon={Clock}
            label="Breaching >24h"
            value={String(sla.breaching_24h)}
            tone={sla.breaching_24h > 0 ? 'warn' : 'default'}
          />
          <StatCard
            icon={TrendingUp}
            label="Avg accept time"
            value={sla.avg_accept_hours != null ? `${sla.avg_accept_hours}h` : '—'}
          />
          <StatCard
            icon={Check}
            label="Resolved (7d)"
            value={String(sla.completed_7d)}
          />
        </div>
      )}

      {/* Requests Queue */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Inbox size={14} className="text-[#c39bff]" /> Agency Requests Queue
            {requests.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c39bff]/20 text-[#c39bff] font-bold">
                {requests.filter(r => r.status === 'pending').length} pending
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {(['all', 'breaching', 'pending', 'active'] as SlaFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSlaFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  slaFilter === f
                    ? 'bg-[#c39bff] text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
            <button onClick={loadRequests} className="ml-2 text-xs text-white/40 hover:text-white">
              Refresh
            </button>
          </div>
        </div>

        {reqLoading ? (
          <p className="text-sm text-white/40">Loading queue…</p>
        ) : filteredRequests.length === 0 ? (
          <p className="text-sm text-white/40">
            {slaFilter === 'breaching'
              ? 'No SLA breaches. Queue is healthy.'
              : 'No open requests. Agencies ping the team via the dashboard CTA.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredRequests.map((r) => {
              const ageHours = (Date.now() - new Date(r.created_at).getTime()) / 3_600_000;
              const isPending = r.status === 'pending';
              const breach48 = isPending && ageHours >= 48;
              const breach24 = isPending && ageHours >= 24 && ageHours < 48;
              const rowBorder = breach48
                ? 'border-red-500/40 bg-red-500/[0.04]'
                : breach24
                ? 'border-amber-500/40 bg-amber-500/[0.04]'
                : 'border-white/10 bg-white/[0.02]';
              return (
              <div key={r.id} className={`rounded-xl border ${rowBorder} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {r.workspace_name ?? r.workspace_id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#a1faff]/10 text-[#a1faff] font-bold uppercase tracking-wider">
                        {TOPIC_LABELS[r.topic] ?? r.topic}
                      </span>
                      <StatusPill status={r.status} />
                      {breach48 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle size={10} /> {Math.floor(ageHours)}h
                        </span>
                      )}
                      {breach24 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock size={10} /> {Math.floor(ageHours)}h
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2 mb-2">{r.notes}</p>
                    <div className="flex items-center gap-3 text-[11px] text-white/40">
                      {r.requester_phone && <span>📱 {r.requester_phone}</span>}
                      {r.event_date && <span>📅 {new Date(r.event_date).toLocaleDateString('en-IN')}</span>}
                      {r.budget_paise && (
                        <span>💰 ₹{(r.budget_paise / 100).toLocaleString('en-IN')}</span>
                      )}
                      <span>{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => patchReq(r.id, 'accepted')}
                        disabled={patching === r.id}
                        className="px-3 py-1.5 rounded-lg bg-[#c39bff] text-black text-xs font-bold hover:bg-[#b48af0] disabled:opacity-40 flex items-center gap-1"
                      >
                        <Check size={12} /> Claim
                      </button>
                    )}
                    {r.status === 'accepted' && (
                      <button
                        onClick={() => patchReq(r.id, 'in_progress')}
                        disabled={patching === r.id}
                        className="px-3 py-1.5 rounded-lg border border-[#a1faff]/40 text-[#a1faff] text-xs font-bold hover:bg-[#a1faff]/10 disabled:opacity-40 flex items-center gap-1"
                      >
                        <Play size={12} /> Start
                      </button>
                    )}
                    {(r.status === 'accepted' || r.status === 'in_progress') && (
                      <>
                        <button
                          onClick={() => {
                            const notes = prompt('Resolution notes (optional):') ?? undefined;
                            patchReq(r.id, 'completed', notes || undefined);
                          }}
                          disabled={patching === r.id}
                          className="px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400 text-xs font-bold hover:bg-green-500/10 disabled:opacity-40 flex items-center gap-1"
                        >
                          <Check size={12} /> Done
                        </button>
                        <button
                          onClick={() => patchReq(r.id, 'cancelled')}
                          disabled={patching === r.id}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-white/50 text-xs hover:text-white hover:border-white/30 disabled:opacity-40 flex items-center gap-1"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assisted search */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Search size={14} className="text-[#c39bff]" /> Assisted Search
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" placeholder="Keyword (dj, singer, band)"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="input-nocturne text-sm" />
          <input type="text" placeholder="City"
            value={city} onChange={(e) => setCity(e.target.value)}
            className="input-nocturne text-sm" />
          <input type="number" placeholder="Max budget (₹)"
            value={budget} onChange={(e) => setBudget(e.target.value)}
            className="input-nocturne text-sm" />
        </div>
        <button onClick={doSearch} disabled={searching}
          className="bg-[#c39bff] text-black text-sm font-bold px-5 py-2 rounded-lg hover:bg-[#b48af0] disabled:opacity-40">
          {searching ? 'Searching…' : 'Search Artists'}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {results.length > 0 && (
          <div className="pt-2 space-y-2 border-t border-white/10">
            <p className="text-xs text-white/30 uppercase tracking-widest font-bold">{results.length} matches</p>
            {results.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white font-bold">{a.stage_name}</p>
                  <p className="text-xs text-white/40">
                    {[a.artist_type, a.base_city, a.trust_score ? `★ ${a.trust_score.toFixed(1)}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {a.base_fee_paise && (
                  <span className="text-sm text-white/80 font-bold">
                    ₹{(a.base_fee_paise / 100).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-5 border border-white/10 text-xs text-white/50">
        <p className="font-bold text-white/70 mb-1">Book on behalf of a client</p>
        <p>Use <code className="text-[#a1faff]">/v1/concierge/bookings</code> with <code className="text-[#a1faff]">client_user_id</code> after confirming the artist with the client on call/WhatsApp.</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ReqStatus }) {
  const styles: Record<ReqStatus, string> = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    accepted: 'bg-[#c39bff]/15 text-[#c39bff] border-[#c39bff]/30',
    in_progress: 'bg-[#a1faff]/15 text-[#a1faff] border-[#a1faff]/30',
    completed: 'bg-green-500/15 text-green-300 border-green-500/30',
    cancelled: 'bg-white/10 text-white/40 border-white/15',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'default' }: { icon: React.ElementType; label: string; value: string; tone?: 'default' | 'warn' | 'danger' }) {
  const toneBorder = tone === 'danger' ? 'border-red-500/40' : tone === 'warn' ? 'border-amber-500/40' : 'border-white/10';
  const toneIcon = tone === 'danger' ? 'text-red-400' : tone === 'warn' ? 'text-amber-400' : 'text-white/40';
  const toneValue = tone === 'danger' ? 'text-red-300' : tone === 'warn' ? 'text-amber-300' : 'text-white';
  return (
    <div className={`glass-card rounded-xl p-4 border ${toneBorder}`}>
      <div className={`flex items-center gap-2 ${toneIcon}`}>
        <Icon size={12} />
        <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${toneValue} mt-2`}>{value}</p>
    </div>
  );
}
