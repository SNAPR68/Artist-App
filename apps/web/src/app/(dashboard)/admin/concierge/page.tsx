'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Users, TrendingUp, Briefcase, Phone } from 'lucide-react';
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

export default function ConciergePage() {
  const [stats, setStats] = useState<ConciergeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ArtistHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const res = await apiClient<ConciergeStats>('/v1/concierge/stats');
    if (res.success) setStats(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

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
        <p>Use <code className="text-[#a1faff]">/v1/concierge/bookings</code> with <code className="text-[#a1faff]">client_user_id</code> after confirming the artist with the client on call/WhatsApp. Full client-pipeline view coming soon at <code className="text-[#a1faff]">/v1/concierge/clients/:id/pipeline</code>.</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 text-white/40">
        <Icon size={12} />
        <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}
