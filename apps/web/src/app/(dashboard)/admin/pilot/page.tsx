'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface PilotInterest {
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

interface ListResponse {
  items: PilotInterest[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

function getStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : '';
}

export default function AdminPilotPage() {
  const [items, setItems] = useState<PilotInterest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient<ListResponse>(
        `/v1/instabook-interest?page=${page}&per_page=20&pilot=true`,
      );
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotalPages(res.data.pagination.total_pages);
        setTotal(res.data.pagination.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function exportCSV() {
    if (items.length === 0) return;
    const headers = [
      'Company',
      'Founder',
      'Phone',
      'Email',
      'City',
      'Events/Month',
      'Start When',
      'Pain Points',
      'Source',
      'Created',
    ];
    const rows = items.map((i) => {
      const rsd = i.role_specific_data || {};
      const company = getStr(rsd, 'company_name') || i.name;
      const founder = i.name.includes('—') ? i.name.split('—')[0]?.trim() ?? '' : i.name;
      return [
        company,
        founder,
        i.phone,
        i.email || '',
        i.city,
        getStr(rsd, 'events_per_month'),
        getStr(rsd, 'start_when'),
        (getStr(rsd, 'pain_points') || i.top_concern || '').replace(/"/g, '""'),
        i.source,
        new Date(i.created_at).toLocaleDateString(),
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pilot-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-white">
            Pilot Leads — Event Company OS
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Applications from <code className="text-[#c39bff]">/pilot</code> landing page
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={items.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">
            Total Pilot Leads
          </div>
          <div className="text-2xl font-extrabold text-[#c39bff]">{total}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">
            Target
          </div>
          <div className="text-2xl font-extrabold text-white">10</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">
            Progress
          </div>
          <div className="text-2xl font-extrabold text-[#a1faff]">
            {Math.min(100, Math.round((total / 10) * 100))}%
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">
            On This Page
          </div>
          <div className="text-2xl font-extrabold text-white">{items.length}</div>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-white/40">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-white/40 mb-2">No pilot applications yet</div>
            <div className="text-white/30 text-xs">
              Leads from <code className="text-[#c39bff]">/pilot</code> appear here
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    Company / Founder
                  </th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    Phone
                  </th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    City
                  </th>
                  <th className="text-center text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    Events/Mo
                  </th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    Start
                  </th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    Pain
                  </th>
                  <th className="text-left text-xs text-white/40 uppercase tracking-wider font-bold p-4">
                    Applied
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const rsd = item.role_specific_data || {};
                  const company = getStr(rsd, 'company_name');
                  const founder = item.name.includes('—')
                    ? item.name.split('—')[0]?.trim() ?? item.name
                    : item.name;
                  const eventsPerMonth = getStr(rsd, 'events_per_month');
                  const startWhen = getStr(rsd, 'start_when');
                  const pain = getStr(rsd, 'pain_points') || item.top_concern || '';
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4">
                        <div className="text-white font-medium">{company || item.name}</div>
                        {company && (
                          <div className="text-white/40 text-xs mt-0.5">{founder}</div>
                        )}
                      </td>
                      <td className="p-4 text-white/60 font-mono text-xs">{item.phone}</td>
                      <td className="p-4 text-white/60">{item.city}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`font-bold ${
                            Number(eventsPerMonth) >= 4 ? 'text-[#c39bff]' : 'text-white/40'
                          }`}
                        >
                          {eventsPerMonth || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-white/60 text-xs">{startWhen || '—'}</td>
                      <td className="p-4 text-white/50 text-xs max-w-xs truncate" title={pain}>
                        {pain || '—'}
                      </td>
                      <td className="p-4 text-white/40 text-xs">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/40 border border-white/5 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs text-white/40">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
