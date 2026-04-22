'use client';

/**
 * Event Company OS — Event Files list page.
 *
 * The central surface for an event company: every event (confirmed, planning,
 * in-progress, completed) with vendor count and budget. Clicking a row opens
 * the Event File detail with tabs for call sheet, rider, BOQ, day-of check-ins.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Plus,
  Wallet,
  ArrowRight,
  Sparkles,
  FolderKanban,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

type EventFileStatus = 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface EventFileRow {
  id: string;
  event_name: string;
  event_date: string;
  call_time: string | null;
  city: string;
  venue: string | null;
  status: EventFileStatus;
  budget_paise: number | null;
  created_at: string;
}

interface ListResponse {
  data: EventFileRow[];
  meta?: { total?: number; page?: number; per_page?: number };
}

const STATUS_STYLES: Record<EventFileStatus, { label: string; cls: string }> = {
  planning:    { label: 'Planning',    cls: 'bg-white/5 text-white/70 border-white/10' },
  confirmed:   { label: 'Confirmed',   cls: 'bg-[#c39bff]/10 text-[#c39bff] border-[#c39bff]/30' },
  in_progress: { label: 'In Progress', cls: 'bg-[#a1faff]/10 text-[#a1faff] border-[#a1faff]/30' },
  completed:   { label: 'Completed',   cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
};

function formatRupees(paise: number | null): string {
  if (!paise) return '—';
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(1)}Cr`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(0)}K`;
  return `₹${rupees.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventFilesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EventFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<ListResponse | EventFileRow[]>('/v1/event-files')
      .then((res) => {
        if (!res.success) {
          setError(res.errors?.[0]?.message || 'Failed to load event files');
          return;
        }
        // API returns { data, meta } wrapped in apiClient success shape
        const payload = res.data as unknown as EventFileRow[] | { data?: EventFileRow[] };
        const list: EventFileRow[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setRows(list);
      })
      .catch((e) => setError(e?.message || 'Network error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Hero */}
      <section className="relative border-b border-white/5 bg-[#1a191b]">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#a1faff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-10 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-[#a1faff] mb-2">
                <FolderKanban className="w-4 h-4" /> Event Files
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tighter">
                Every event, one file.
              </h1>
              <p className="text-white/50 mt-2 max-w-xl">
                Vendors, call sheets, riders, BOQ and day-of check-ins — all in one place per event.
              </p>
            </div>
            <button
              onClick={() => router.push('/event-company/event-files/new')}
              className="btn-nocturne-primary flex items-center gap-2 px-5 py-3"
            >
              <Plus className="w-4 h-4" /> New Event File
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {loading && <div className="nocturne-skeleton h-32 rounded-xl" />}

        {error && !loading && (
          <div className="glass-card rounded-xl p-6 border border-red-500/20 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center border border-white/5">
            <Sparkles className="w-10 h-10 text-[#c39bff] mx-auto mb-4" />
            <h3 className="font-display text-2xl font-extrabold tracking-tight">No event files yet</h3>
            <p className="text-white/50 mt-2 max-w-md mx-auto">
              Create your first Event File to start coordinating vendors, call sheets, and day-of ops.
            </p>
            <button
              onClick={() => router.push('/event-company/event-files/new')}
              className="btn-nocturne-primary mt-6 px-6 py-3"
            >
              Create Event File
            </button>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((row) => {
              const statusStyle = STATUS_STYLES[row.status];
              return (
                <Link
                  key={row.id}
                  href={`/event-company/event-files/${row.id}`}
                  className="glass-card rounded-xl p-6 border border-white/5 hover:border-[#c39bff]/30 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#c39bff]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#c39bff]/15 transition" />
                  <div className="flex items-start justify-between mb-4">
                    <span className={`nocturne-chip text-xs ${statusStyle.cls}`}>
                      {statusStyle.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#c39bff] transition" />
                  </div>
                  <h3 className="font-display text-xl font-extrabold tracking-tight truncate">
                    {row.event_name}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-sm text-white/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(row.event_date)}{row.call_time ? ` • ${row.call_time.slice(0, 5)}` : ''}
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{row.venue ? `${row.venue}, ${row.city}` : row.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5" />
                      {formatRupees(row.budget_paise)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
