'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface InstabookInterest {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  excitement_score: number;
  top_concern: string | null;
  would_use_first_month: string;
  role_specific_data: Record<string, unknown>;
  source: string;
  created_at: string;
}

interface Stats {
  total: number;
  by_role: Record<string, number>;
  by_excitement: Record<number, number>;
  avg_excitement: number;
  would_use_yes_pct: number;
}

interface ListResponse {
  items: InstabookInterest[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

const ROLE_LABELS: Record<string, string> = {
  artist: 'Artist',
  event_company: 'Event Co.',
  client: 'Client',
  agent: 'Agent',
};

const ROLE_COLORS: Record<string, string> = {
  artist: 'text-[#c39bff] bg-[#c39bff]/10',
  event_company: 'text-[#a1faff] bg-[#a1faff]/10',
  client: 'text-[#ffbf00] bg-[#ffbf00]/10',
  agent: 'text-green-400 bg-green-400/10',
};

export default function AdminInstabookPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<InstabookInterest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient<Stats>('/v1/instabook-interest/stats'),
        apiClient<ListResponse>(`/v1/instabook-interest?page=${page}&per_page=20${roleFilter ? `&role=${roleFilter}` : ''}`),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (listRes.success && listRes.data) {
        setItems(listRes.data.items);
        setTotalPages(listRes.data.pagination.total_pages);
        setTotal(listRes.data.pagination.total);
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function exportCSV() {
    if (items.length === 0) return;
    const headers = ['Name', 'Phone', 'Email', 'City', 'Role', 'Excitement', 'Would Use', 'Source', 'Top Concern', 'Created'];
    const rows = items.map(i => [
      i.name, i.phone, i.email || '', i.city, i.role,
      String(i.excitement_score), i.would_use_first_month, i.source,
      (i.top_concern || '').replace(/"/g, '""'), new Date(i.created_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instabook-interests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-white">InstaBook Interest</h1>
          <p className="text-white/40 text-sm mt-1">Waitlist submissions from the interest form</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={items.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Total</div>
            <div className="text-2xl font-extrabold text-white">{stats.total}</div>
          </div>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <div key={key} className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">{label}</div>
              <div className="text-2xl font-extrabold text-white">{stats.by_role[key] || 0}</div>
            </div>
          ))}
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Avg Excitement</div>
            <div className="text-2xl font-extrabold text-[#c39bff]">{stats.avg_excitement}/5</div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Would Use</div>
            <div className="text-2xl font-extrabold text-[#a1faff]">{stats.would_use_yes_pct}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setRoleFilter(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !roleFilter ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40' : 'bg-white/5 text-white/40 border border-white/5'
          }`}
        >
          All ({total})
        </button>
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setRoleFilter(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              roleFilter === key ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40' : 'bg-white/5 text-white/40 border border-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-white/40">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-white/40">No submissions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">Name</th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">Phone</th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">City</th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">Role</th>
                  <th className="text-center text-xs text-white/40 uppercase tracking-wider font-bold p-4">Score</th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">Use?</th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">Source</th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium">{item.name}</td>
                    <td className="p-4 text-white/60">{item.phone}</td>
                    <td className="p-4 text-white/60">{item.city}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[item.role] || 'text-white/40'}`}>
                        {ROLE_LABELS[item.role] || item.role}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${item.excitement_score >= 4 ? 'text-[#c39bff]' : item.excitement_score >= 3 ? 'text-white/60' : 'text-white/30'}`}>
                        {item.excitement_score}/5
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-medium ${
                        item.would_use_first_month === 'yes' ? 'text-green-400'
                          : item.would_use_first_month === 'maybe' ? 'text-[#ffbf00]'
                          : 'text-white/30'
                      }`}>
                        {item.would_use_first_month}
                      </span>
                    </td>
                    <td className="p-4 text-white/40 text-xs">{item.source}</td>
                    <td className="p-4 text-white/40 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/40 border border-white/5 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs text-white/40">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/40 border border-white/5 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
