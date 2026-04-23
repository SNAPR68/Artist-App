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
  Pencil,
  Trash2,
  Loader2,
  X,
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
  confirmation_status?: 'pending' | 'confirmed' | 'declined' | 'no_response';
  confirmation_sent_at?: string | null;
  confirmation_responded_at?: string | null;
  checkin_status?: 'pending' | 'on_track' | 'delayed' | 'help' | 'no_response';
  checkin_sent_at?: string | null;
  checkin_responded_at?: string | null;
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

  const [sendingConfirm, setSendingConfirm] = useState(false);
  const [sendingCheckin, setSendingCheckin] = useState(false);
  const [lastDispatchResult, setLastDispatchResult] = useState<string | null>(null);

  async function refreshFile() {
    const res = await apiClient<EventFileDetail>(`/v1/event-files/${id}`);
    if (res.success) setFile(res.data);
  }

  async function sendVendorConfirmations() {
    setSendingConfirm(true);
    setLastDispatchResult(null);
    try {
      const res = await apiClient<{ sent: number; attempted: number }>(
        `/v1/event-files/${id}/vendor-confirmations`,
        { method: 'POST' },
      );
      if (res.success) {
        setLastDispatchResult(`Confirmations: ${res.data.sent}/${res.data.attempted} sent via WhatsApp.`);
        await refreshFile();
      }
    } finally {
      setSendingConfirm(false);
    }
  }

  async function sendDayOfCheckins() {
    setSendingCheckin(true);
    setLastDispatchResult(null);
    try {
      const res = await apiClient<{ sent: number; attempted: number }>(
        `/v1/event-files/${id}/day-of-checkins`,
        { method: 'POST' },
      );
      if (res.success) {
        setLastDispatchResult(`Check-ins: ${res.data.sent}/${res.data.attempted} sent via WhatsApp.`);
        await refreshFile();
      }
    } finally {
      setSendingCheckin(false);
    }
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
        {tab === 'day-of' && (
          <DayOfTab
            file={file}
            sendingConfirm={sendingConfirm}
            sendingCheckin={sendingCheckin}
            lastResult={lastDispatchResult}
            onSendConfirmations={sendVendorConfirmations}
            onSendCheckins={sendDayOfCheckins}
          />
        )}
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
          <div className="flex flex-col items-end gap-1.5">
            <ConfirmationChip status={v.confirmation_status ?? 'pending'} />
            {v.checkin_status && v.checkin_status !== 'pending' && <CheckinChip status={v.checkin_status} />}
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
interface BOQItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit_price_inr: number;
  gst_rate_pct: number | null;
  sort_order: number;
  vendor_profile_id: string | null;
}
interface BOQDoc { pdf_url?: string; xlsx_url?: string }

const CATEGORY_OPTIONS = ['artist', 'av', 'photo', 'decor', 'license', 'promoters', 'transport', 'other'];

const EMPTY_FORM = { category: 'artist', description: '', quantity: 1, unit_price_inr: 0, gst_rate_pct: 18 };

function boqTotal(items: BOQItem[]): number {
  return items.reduce((sum, it) => {
    const base = it.quantity * it.unit_price_inr;
    const gst = base * ((it.gst_rate_pct ?? 0) / 100);
    return sum + base + gst;
  }, 0);
}

function BOQTab({ fileId }: { fileId: string }) {
  const [items, setItems] = useState<BOQItem[]>([]);
  const [doc, setDoc] = useState<BOQDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [itemsRes, docRes] = await Promise.all([
      apiClient<BOQItem[]>(`/v1/event-files/${fileId}/boq/items`),
      apiClient<BOQDoc>(`/v1/event-files/${fileId}/boq`),
    ]);
    if (itemsRes.success) setItems((itemsRes.data as BOQItem[] | null) ?? []);
    if (docRes.success) setDoc(docRes.data as BOQDoc | null);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  async function handleSeed() {
    setSeeding(true);
    try {
      await apiClient(`/v1/event-files/${fileId}/boq/seed`, { method: 'POST' });
      await refresh();
    } catch { /* silent */ } finally { setSeeding(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      await apiClient(`/v1/event-files/${fileId}/boq`, { method: 'POST' });
      await refresh();
    } catch { /* silent */ } finally { setGenerating(false); }
  }

  async function handleAdd() {
    setSaving(true);
    try {
      await apiClient(`/v1/event-files/${fileId}/boq/items`, {
        method: 'POST',
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), unit_price_inr: Number(form.unit_price_inr), gst_rate_pct: Number(form.gst_rate_pct) }),
      });
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
      await refresh();
    } catch { /* silent */ } finally { setSaving(false); }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await apiClient(`/v1/event-files/${fileId}/boq/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), unit_price_inr: Number(form.unit_price_inr), gst_rate_pct: Number(form.gst_rate_pct) }),
      });
      setEditId(null);
      await refresh();
    } catch { /* silent */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await apiClient(`/v1/event-files/${fileId}/boq/items/${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function startEdit(item: BOQItem) {
    setEditId(item.id);
    setShowAdd(false);
    setForm({
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit_price_inr: item.unit_price_inr,
      gst_rate_pct: item.gst_rate_pct ?? 18,
    });
  }

  if (loading) return <div className="nocturne-skeleton h-64 rounded-xl" />;

  const grandTotal = boqTotal(items);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-extrabold tracking-tight">Bill of Quantities</h3>
          <p className="text-white/50 text-sm mt-0.5">Line-item budget rollup across all vendors.</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn-nocturne-secondary flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
              Seed from Roster
            </button>
          )}
          <button
            onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...EMPTY_FORM }); }}
            className="btn-nocturne-secondary flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add Line
          </button>
          {items.length > 0 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-nocturne-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Generate BOQ
            </button>
          )}
        </div>
      </div>

      {/* Add row form */}
      {showAdd && (
        <BOQItemForm
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          title="Add Line Item"
        />
      )}

      {/* Line items */}
      {items.length === 0 && !showAdd ? (
        <div className="glass-card rounded-xl p-12 text-center border border-white/5">
          <Receipt className="w-10 h-10 text-[#c39bff] mx-auto mb-4" />
          <h3 className="font-display text-xl font-extrabold">No line items yet</h3>
          <p className="text-white/50 mt-2 text-sm">Seed from your vendor roster or add items manually.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs tracking-widest uppercase">
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Description</th>
                <th className="text-right p-4">Qty</th>
                <th className="text-right p-4">Unit Price</th>
                <th className="text-right p-4">GST %</th>
                <th className="text-right p-4">Total (incl. GST)</th>
                <th className="p-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const base = item.quantity * item.unit_price_inr;
                const gst = base * ((item.gst_rate_pct ?? 0) / 100);
                const lineTotal = base + gst;
                return editId === item.id ? (
                  <tr key={item.id} className="border-b border-white/5 bg-white/[0.02]">
                    <td colSpan={7} className="p-4">
                      <BOQItemForm
                        form={form}
                        setForm={setForm}
                        saving={saving}
                        onSave={() => handleUpdate(item.id)}
                        onCancel={() => setEditId(null)}
                        title="Edit Line Item"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                    <td className="p-4">
                      <span className="nocturne-chip text-xs capitalize">{item.category}</span>
                    </td>
                    <td className="p-4 text-white/80">{item.description}</td>
                    <td className="p-4 text-right text-white/60">{item.quantity}</td>
                    <td className="p-4 text-right text-white/60">₹{item.unit_price_inr.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right text-white/60">{item.gst_rate_pct ?? 0}%</td>
                    <td className="p-4 text-right font-semibold text-[#a1faff]">
                      ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(item)} className="text-white/30 hover:text-white transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-white/30 hover:text-red-400 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td colSpan={5} className="p-4 text-right text-white/40 text-xs tracking-widest uppercase font-bold">Grand Total (incl. GST)</td>
                  <td className="p-4 text-right font-extrabold text-[#ffbf00] text-base">
                    ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Download links */}
      {(doc?.pdf_url || doc?.xlsx_url) && (
        <div className="flex gap-3">
          {doc.pdf_url && (
            <a href={doc.pdf_url} target="_blank" rel="noreferrer" className="btn-nocturne-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
              <Download className="w-4 h-4" /> BOQ PDF
            </a>
          )}
          {doc.xlsx_url && (
            <a href={doc.xlsx_url} target="_blank" rel="noreferrer" className="btn-nocturne-secondary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
              <Download className="w-4 h-4" /> BOQ Excel
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function BOQItemForm({
  form, setForm, saving, onSave, onCancel, title,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}) {
  return (
    <div className="glass-card rounded-xl p-5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/70">{title}</span>
        <button onClick={onCancel} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-widest mb-1 block">Category</label>
          <select
            className="input-nocturne w-full text-sm"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/40 uppercase tracking-widest mb-1 block">Description</label>
          <input
            className="input-nocturne w-full text-sm"
            placeholder="e.g. DJ Setup & Performance – 4 hrs"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-widest mb-1 block">Qty</label>
          <input
            type="number" min={1}
            className="input-nocturne w-full text-sm"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-widest mb-1 block">Unit Price (₹)</label>
          <input
            type="number" min={0}
            className="input-nocturne w-full text-sm"
            value={form.unit_price_inr}
            onChange={(e) => setForm((f) => ({ ...f, unit_price_inr: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-widest mb-1 block">GST %</label>
          <input
            type="number" min={0} max={100}
            className="input-nocturne w-full text-sm"
            value={form.gst_rate_pct}
            onChange={(e) => setForm((f) => ({ ...f, gst_rate_pct: Number(e.target.value) }))}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-sm px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white transition">Cancel</button>
        <button
          onClick={onSave}
          disabled={saving || !form.description.trim()}
          className="btn-nocturne-primary text-sm px-5 py-2 rounded-lg flex items-center gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Status chips ────────────────────────────────────────────────────────────
const CONFIRM_STYLES: Record<NonNullable<VendorRow['confirmation_status']>, { label: string; cls: string }> = {
  pending:     { label: 'Pending',      cls: 'bg-white/5 text-white/50 border-white/10' },
  confirmed:   { label: 'Confirmed',    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  declined:    { label: 'Declined',     cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  no_response: { label: 'No response',  cls: 'bg-[#ffbf00]/10 text-[#ffbf00] border-[#ffbf00]/30' },
};

const CHECKIN_STYLES: Record<NonNullable<VendorRow['checkin_status']>, { label: string; cls: string }> = {
  pending:     { label: 'Check-in pending', cls: 'bg-white/5 text-white/50 border-white/10' },
  on_track:    { label: 'On track',         cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  delayed:     { label: 'Delayed',          cls: 'bg-[#ffbf00]/10 text-[#ffbf00] border-[#ffbf00]/30' },
  help:        { label: 'Help',             cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  no_response: { label: 'No response',      cls: 'bg-white/5 text-white/40 border-white/10' },
};

function ConfirmationChip({ status }: { status: NonNullable<VendorRow['confirmation_status']> }) {
  const s = CONFIRM_STYLES[status];
  return <span className={`nocturne-chip text-[10px] ${s.cls}`}>{s.label}</span>;
}
function CheckinChip({ status }: { status: NonNullable<VendorRow['checkin_status']> }) {
  const s = CHECKIN_STYLES[status];
  return <span className={`nocturne-chip text-[10px] ${s.cls}`}>{s.label}</span>;
}

// ─── Day-of tab ──────────────────────────────────────────────────────────────
function DayOfTab({
  file, sendingConfirm, sendingCheckin, lastResult, onSendConfirmations, onSendCheckins,
}: {
  file: EventFileDetail;
  sendingConfirm: boolean;
  sendingCheckin: boolean;
  lastResult: string | null;
  onSendConfirmations: () => void;
  onSendCheckins: () => void;
}) {
  const totals = file.vendors.reduce(
    (acc, v) => {
      acc.confirm[v.confirmation_status ?? 'pending']++;
      if (v.checkin_status) acc.checkin[v.checkin_status]++;
      return acc;
    },
    {
      confirm: { pending: 0, confirmed: 0, declined: 0, no_response: 0 },
      checkin: { pending: 0, on_track: 0, delayed: 0, help: 0, no_response: 0 },
    },
  );

  return (
    <div className="space-y-6">
      {/* Dispatch controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-[#c39bff]" />
            <h4 className="font-display text-lg font-extrabold tracking-tight">Vendor Confirmations</h4>
          </div>
          <p className="text-white/50 text-sm mb-4">
            Send each vendor a WhatsApp message asking them to confirm this booking (YES / NO).
          </p>
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            <span className="nocturne-chip bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              Confirmed: {totals.confirm.confirmed}
            </span>
            <span className="nocturne-chip bg-white/5 text-white/50 border-white/10">
              Pending: {totals.confirm.pending}
            </span>
            <span className="nocturne-chip bg-red-500/10 text-red-300 border-red-500/30">
              Declined: {totals.confirm.declined}
            </span>
          </div>
          <button
            onClick={onSendConfirmations}
            disabled={sendingConfirm}
            className="btn-nocturne-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50"
          >
            {sendingConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            Send Confirmations
          </button>
        </div>

        <div className="glass-card rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[#a1faff]" />
            <h4 className="font-display text-lg font-extrabold tracking-tight">Day-of Check-ins</h4>
          </div>
          <p className="text-white/50 text-sm mb-4">
            Morning-of WhatsApp ping: reply YES / DELAYED / HELP. Sent only to confirmed vendors.
          </p>
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            <span className="nocturne-chip bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              On track: {totals.checkin.on_track}
            </span>
            <span className="nocturne-chip bg-[#ffbf00]/10 text-[#ffbf00] border-[#ffbf00]/30">
              Delayed: {totals.checkin.delayed}
            </span>
            <span className="nocturne-chip bg-red-500/10 text-red-300 border-red-500/30">
              Help: {totals.checkin.help}
            </span>
          </div>
          <button
            onClick={onSendCheckins}
            disabled={sendingCheckin}
            className="btn-nocturne-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50"
          >
            {sendingCheckin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            Send Check-ins
          </button>
        </div>
      </div>

      {lastResult && (
        <div className="glass-card rounded-xl p-4 border border-[#c39bff]/20 text-sm text-[#c39bff]">
          {lastResult}
        </div>
      )}

      {/* Vendor status list */}
      <div>
        <h4 className="font-display text-base font-extrabold tracking-tight mb-3">Per-vendor status</h4>
        {file.vendors.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center border border-white/5 text-white/40">
            Add vendors to the roster to enable WhatsApp dispatch.
          </div>
        ) : (
          <div className="space-y-2">
            {file.vendors.map((v) => (
              <div key={v.id} className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
                <div className="flex-1 text-sm">
                  <div className="font-medium">{v.stage_name || 'Unnamed vendor'}</div>
                  <div className="text-xs text-white/40">{v.category ?? 'vendor'} · {v.role}</div>
                </div>
                <ConfirmationChip status={v.confirmation_status ?? 'pending'} />
                {v.checkin_status && v.checkin_status !== 'pending' && <CheckinChip status={v.checkin_status} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
