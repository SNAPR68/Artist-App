'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface VaultItem {
  type: 'brief' | 'booking';
  id: string;
  title: string;
  event_type?: string | null;
  city?: string | null;
  status: string;
  artist_name?: string | null;
  amount_paise?: number | null;
  event_date?: string | null;
  date: string;
  raw_text?: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e', settled: '#22c55e', confirmed: '#22c55e',
  negotiating: '#facc15', quoted: '#facc15',
  inquiry: '#c39bff', draft: '#c39bff', collecting: '#c39bff',
  cancelled: '#ef4444', expired: '#6b7280', disputed: '#ef4444',
};

export default function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'briefs' | 'bookings'>('all');
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    params.set('source', filterType);
    params.set('page', String(page));
    params.set('per_page', '20');

    const res = await apiClient<any>(`/v1/vault/history?${params.toString()}`);
    if (res.success && res.data) {
      setItems(res.data.results || []);
      setTotal(res.data.total || 0);
    }
    setLoading(false);
  }, [searchQuery, filterType, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/vault/export`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grid-deal-history.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Deal Vault</h1>
          <p className="text-white/30 text-sm">{total} total records — briefs + bookings</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search deals by event type, city, artist..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#c39bff]/50"
        />
        <div className="flex gap-2">
          {(['all', 'briefs', 'bookings'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilterType(f); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterType === f
                  ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/30'
                  : 'bg-white/5 text-white/30 border border-white/8 hover:border-white/15'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/20 text-sm mb-4">No deals found{searchQuery ? ` for "${searchQuery}"` : ''}</p>
          <Link href="/" className="text-[#c39bff] text-sm hover:underline">Submit your first brief</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.type === 'booking' ? `/client/bookings/${item.id}` : `/brief?session=${item.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/8 hover:border-white/15 transition-all group"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              {/* Type badge */}
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                item.type === 'brief' ? 'bg-[#c39bff]/15 text-[#c39bff]' : 'bg-[#a1faff]/15 text-[#a1faff]'
              }`}>
                {item.type}
              </span>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white group-hover:text-[#c39bff] transition-colors truncate">{item.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/25 mt-0.5">
                  {item.city && <span>{item.city}</span>}
                  {item.event_date && (
                    <span>{new Date(item.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  {item.artist_name && <span>· {item.artist_name}</span>}
                </div>
              </div>

              {/* Amount */}
              {item.amount_paise && (
                <span className="text-xs text-white/40 font-medium">
                  ₹{(item.amount_paise / 100).toLocaleString('en-IN')}
                </span>
              )}

              {/* Status */}
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: `${STATUS_COLORS[item.status] || '#6b7280'}15`,
                  color: STATUS_COLORS[item.status] || '#6b7280',
                }}
              >
                {item.status.replace(/_/g, ' ')}
              </span>

              {/* Date */}
              <span className="text-[10px] text-white/20 w-16 text-right flex-shrink-0">
                {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs text-white/30 border border-white/8 hover:border-white/15 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-white/20">Page {page} of {Math.ceil(total / 20)}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 rounded-lg text-xs text-white/30 border border-white/8 hover:border-white/15 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
