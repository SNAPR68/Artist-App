'use client';

/**
 * Event Company OS — Event File detail page.
 *
 * Tabs: Roster | Call Sheets | Rider | BOQ | Day-of
 * Everything the day coordinator needs for one event, in one screen.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Wallet,
  Users,
  FileText,
  Receipt,
  Wrench,
  Phone,
  Download,
  Plus,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

type TabKey = 'roster' | 'call-sheets' | 'rider' | 'boq' | 'day-of';

type EventFileStatus = 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface VendorRow {
  id: string;
  vendor_profile_id: string;
  booking_id: string | null;
  role: string;
  call_time_override: string | null;
  notes: string | null;
  stage_name: string | null;
  category: string | null;
  base_city: string | null;
  booking_status: string | null;
  booking_amount: number | null;
}

interface EventFileDetail {
  id: string;
  client_id: string;
  event_name: string;
  event_date: string;
  call_time: string | null;
  city: string;
  venue: string | null;
  brief: Record<string, unknown>;
  status: EventFileStatus;
  budget_paise: number | null;
  vendors: VendorRow[];
}

interface CallSheetRow {
  id: string;
  pdf_url: string | null;
  xlsx_url: string | null;
  generated_at: string;
  dispatches?: Array<{ channel: string; sent_count: number; failed_count: number }>;
}

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'roster',      label: 'Vendor Roster', icon: Users },
  { key: 'call-sheets', label: 'Call Sheets',   icon: FileText },
  { key: 'rider',       label: 'Tech Rider',    icon: Wrench },
  { key: 'boq',         label: 'BOQ',           icon: Receipt },
  { key: 'day-of',      label: 'Day-of',        icon: Phone },
];

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
  return `₹${rupees.toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function EventFileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [file, setFile] = useState<EventFileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('roster');

  // Call-sheet tab state
  const [callSheets, setCallSheets] = useState<CallSheetRow[]>([]);
  const [csLoading, setCsLoading] = useState(false);
  const [csGenerating, setCsGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient<EventFileDetail>(`/v1/event-files/${id}`)
      .then((res) => {
        if (!res.success) {
          setError(res.errors?.[0]?.message || 'Failed to load event file');
          return;
        }
        setFile(res.data);
      })
      .catch((e) => setError(e?.message || 'Network error'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab !== 'call-sheets' || !id) return;
    setCsLoading(true);
    apiClient<CallSheetRow[]>(`/v1/event-files/${id}/call-sheets`)
      .then((res) => {
        if (res.success) setCallSheets((res.data as CallSheetRow[] | null) ?? []);
      })
      .finally(() => setCsLoading(false));
  }, [tab, id]);

  async function generateCallSheet() {
    setCsGenerating(true);
    try {
      const res = await apiClient<CallSheetRow>(`/v1/event-files/${id}/call-sheet`, {
        method: 'POST',
      });
      if (res.success) {
        setCallSheets((prev) => [res.data, ...prev]);
      }
    } finally {
      setCsGenerating(false);
    }
  }

  async function dispatchDayOfCheckin() {
    await apiClient(`/v1/outbound-voice/event-files/${id}/day-of-checkin`, {
      method: 'POST',
    });
    alert('Day-of check-in calls queued for all vendors on this event.');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="nocturne-skeleton h-40 rounded-xl mb-6" />
          <div className="nocturne-skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white p-8">
        <div className="max-w-4xl mx-auto glass-card rounded-xl p-8 border border-red-500/20 text-red-300">
          {error || 'Event file not found.'}
          <div className="mt-4">
            <Link href="/event-company/event-files" className="text-[#c39bff] hover:underline">
              ← Back to event files
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[file.status];

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Hero */}
      <section className="relative border-b border-white/5 bg-[#1a191b]">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#a1faff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-8 relative">
          <button
            onClick={() => router.push('/event-company/event-files')}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" /> All event files
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className={`nocturne-chip text-xs ${statusStyle.cls} mb-3 inline-block`}>
                {statusStyle.label}
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tighter">
                {file.event_name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {formatDate(file.event_date)}</span>
                {file.call_time && <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Call {file.call_time.slice(0, 5)}</span>}
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {file.venue ? `${file.venue}, ${file.city}` : file.city}</span>
                <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> {formatRupees(file.budget_paise)}</span>
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {file.vendors.length} vendors</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-white/5 bg-[#1a191b]/50 sticky top-0 z-10 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    active
                      ? 'border-[#c39bff] text-white'
                      : 'border-transparent text-white/50 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tab content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'roster' && <RosterTab file={file} />}
        {tab === 'call-sheets' && (
          <CallSheetTab
            sheets={callSheets}
            loading={csLoading}
            generating={csGenerating}
            onGenerate={generateCallSheet}
          />
        )}
        {tab === 'rider' && <RiderTab fileId={file.id} />}
        {tab === 'boq' && <BOQTab fileId={file.id} />}
        {tab === 'day-of' && <DayOfTab file={file} onDispatch={dispatchDayOfCheckin} />}
      </section>
    </div>
  );
}

// ─── Roster tab ──────────────────────────────────────────────────────────────
function RosterTab({ file }: { file: EventFileDetail }) {
  if (file.vendors.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center border border-white/5">
        <Users className="w-10 h-10 text-[#c39bff] mx-auto mb-4" />
        <h3 className="font-display text-xl font-extrabold tracking-tight">No vendors yet</h3>
        <p className="text-white/50 mt-2">Add artists, AV, photo, decor, or licensing partners.</p>
        <Link href="/search" className="btn-nocturne-primary mt-6 inline-flex items-center gap-2 px-5 py-2.5">
          <Plus className="w-4 h-4" /> Browse Vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {file.vendors.map((v) => (
        <div key={v.id} className="glass-card rounded-xl p-5 border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#c39bff]/10 border border-[#c39bff]/30 flex items-center justify-center text-[#c39bff] font-bold text-sm">
            {(v.stage_name || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold truncate">{v.stage_name || 'Unnamed vendor'}</h4>
              <span className="nocturne-chip text-xs bg-white/5 text-white/60 border-white/10">
                {v.category || 'vendor'}
              </span>
              <span className="nocturne-chip text-xs bg-[#c39bff]/10 text-[#c39bff] border-[#c39bff]/30">
                {v.role}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-white/50">
              {v.base_city && <span>{v.base_city}</span>}
              {v.call_time_override && <span>Call: {v.call_time_override.slice(0, 5)}</span>}
              {v.booking_status && <span>Booking: {v.booking_status}</span>}
              {v.booking_amount && <span>{formatRupees(v.booking_amount)}</span>}
            </div>
            {v.notes && <p className="text-xs text-white/40 mt-1 italic">{v.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Call Sheet tab ──────────────────────────────────────────────────────────
function CallSheetTab({
  sheets, loading, generating, onGenerate,
}: {
  sheets: CallSheetRow[];
  loading: boolean;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-xl font-extrabold tracking-tight">Call Sheets</h3>
          <p className="text-white/50 text-sm mt-1">
            Generate a PDF + Excel call sheet for the full vendor roster.
          </p>
        </div>
        <button onClick={onGenerate} disabled={generating} className="btn-nocturne-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50">
          <Plus className="w-4 h-4" /> {generating ? 'Generating…' : 'Generate New'}
        </button>
      </div>

      {loading && <div className="nocturne-skeleton h-24 rounded-xl" />}
      {!loading && sheets.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center border border-white/5">
          <FileText className="w-10 h-10 text-[#c39bff] mx-auto mb-4" />
          <h3 className="font-display text-xl font-extrabold">No call sheets generated yet</h3>
          <p className="text-white/50 mt-2">Click Generate to create one from the current roster.</p>
        </div>
      )}

      <div className="space-y-3">
        {sheets.map((s) => (
          <div key={s.id} className="glass-card rounded-xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#c39bff]/10 border border-[#c39bff]/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#c39bff]" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Call sheet · {new Date(s.generated_at).toLocaleString('en-IN')}</div>
              {s.dispatches && s.dispatches.length > 0 && (
                <div className="text-xs text-white/50 mt-1">
                  {s.dispatches.map((d, i) => (
                    <span key={i} className="mr-3">{d.channel}: {d.sent_count} sent</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {s.pdf_url && (
                <a href={s.pdf_url} target="_blank" rel="noreferrer" className="btn-nocturne-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
              )}
              {s.xlsx_url && (
                <a href={s.xlsx_url} target="_blank" rel="noreferrer" className="btn-nocturne-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Excel
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rider tab ───────────────────────────────────────────────────────────────
interface RiderData { pdf_url?: string }
function RiderTab({ fileId }: { fileId: string }) {
  const [data, setData] = useState<RiderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<RiderData>(`/v1/event-files/${fileId}/consolidated-rider`)
      .then((res) => res.success && setData(res.data))
      .finally(() => setLoading(false));
  }, [fileId]);

  if (loading) return <div className="nocturne-skeleton h-48 rounded-xl" />;

  return (
    <div className="glass-card rounded-xl p-8 border border-white/5">
      <h3 className="font-display text-xl font-extrabold tracking-tight mb-4">Consolidated Tech Rider</h3>
      <p className="text-white/50 text-sm mb-6">
        Merged rider across all vendors on this event. Ready to hand to the venue.
      </p>
      {data?.pdf_url ? (
        <a href={data.pdf_url} target="_blank" rel="noreferrer" className="btn-nocturne-primary inline-flex items-center gap-2 px-5 py-2.5">
          <Download className="w-4 h-4" /> Download Rider PDF
        </a>
      ) : (
        <p className="text-white/40 italic">No consolidated rider yet. Add vendors to generate.</p>
      )}
    </div>
  );
}

// ─── BOQ tab ─────────────────────────────────────────────────────────────────
interface BOQData { pdf_url?: string; xlsx_url?: string }
function BOQTab({ fileId }: { fileId: string }) {
  const [data, setData] = useState<BOQData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<BOQData>(`/v1/event-files/${fileId}/boq`)
      .then((res) => res.success && setData(res.data))
      .finally(() => setLoading(false));
  }, [fileId]);

  if (loading) return <div className="nocturne-skeleton h-48 rounded-xl" />;

  return (
    <div className="glass-card rounded-xl p-8 border border-white/5">
      <h3 className="font-display text-xl font-extrabold tracking-tight mb-4">Bill of Quantities</h3>
      <p className="text-white/50 text-sm mb-6">Line-item budget rollup across all vendors.</p>
      {data?.pdf_url || data?.xlsx_url ? (
        <div className="flex gap-3">
          {data.pdf_url && (
            <a href={data.pdf_url} target="_blank" rel="noreferrer" className="btn-nocturne-primary inline-flex items-center gap-2 px-5 py-2.5">
              <Download className="w-4 h-4" /> BOQ PDF
            </a>
          )}
          {data.xlsx_url && (
            <a href={data.xlsx_url} target="_blank" rel="noreferrer" className="btn-nocturne-secondary inline-flex items-center gap-2 px-5 py-2.5">
              <Download className="w-4 h-4" /> BOQ Excel
            </a>
          )}
        </div>
      ) : (
        <p className="text-white/40 italic">No BOQ generated yet.</p>
      )}
    </div>
  );
}

// ─── Day-of tab ──────────────────────────────────────────────────────────────
interface CallRow {
  id: string;
  vendor_name?: string;
  vendor_profile_id: string;
  purpose: string;
  status: string;
  available?: boolean;
}
function DayOfTab({ file, onDispatch }: { file: EventFileDetail; onDispatch: () => void }) {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<CallRow[]>(`/v1/outbound-voice/event-files/${file.id}/calls`)
      .then((res) => res.success && setCalls((res.data as CallRow[] | null) ?? []))
      .finally(() => setLoading(false));
  }, [file.id]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-xl font-extrabold tracking-tight">Day-of Check-in Calls</h3>
          <p className="text-white/50 text-sm mt-1">
            AI-dialed voice check-ins to all vendors on the roster.
          </p>
        </div>
        <button onClick={onDispatch} className="btn-nocturne-primary flex items-center gap-2 px-5 py-2.5">
          <Phone className="w-4 h-4" /> Dispatch to All
        </button>
      </div>

      {loading && <div className="nocturne-skeleton h-32 rounded-xl" />}
      {!loading && calls.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center border border-white/5">
          <Phone className="w-10 h-10 text-[#c39bff] mx-auto mb-4" />
          <h3 className="font-display text-xl font-extrabold">No calls yet</h3>
          <p className="text-white/50 mt-2">Dispatch day-of check-ins on event day to confirm arrivals.</p>
        </div>
      )}

      <div className="space-y-2">
        {calls.map((c) => (
          <div key={c.id} className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <Phone className="w-4 h-4 text-[#a1faff]" />
            <div className="flex-1 text-sm">
              <div className="font-medium">{c.vendor_name || c.vendor_profile_id}</div>
              <div className="text-xs text-white/40">{c.purpose} · {c.status}</div>
            </div>
            {c.available === true && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}
