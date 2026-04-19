'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Download, Settings as SettingsIcon, Check, X, Trash2, ExternalLink } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface Workspace { id: string; name: string }

interface GstSettings {
  workspace_id: string;
  legal_name: string;
  gstin: string | null;
  pan: string | null;
  state_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  default_sac_code: string;
  default_tax_rate: number;
  invoice_prefix: string;
  financial_year: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  recipient_name: string;
  recipient_gstin: string | null;
  subtotal_paise: number;
  total_paise: number;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  tax_mode: 'intra' | 'inter';
}

interface LineItemDraft {
  description: string;
  sac_code: string;
  quantity: number;
  unit_price_rupees: string;
  tax_rate: number;
}

const rupees = (p: number) => '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const currentFY = () => {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 3 ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : `${y - 1}-${String(y % 100).padStart(2, '0')}`;
};

export default function InvoicesPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [settings, setSettings] = useState<GstSettings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState(currentFY());
  const [showSettings, setShowSettings] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadInvoices = useCallback(async (wid: string, year: string) => {
    const res = await apiClient<{ rows: Invoice[] }>(`/v1/workspaces/${wid}/gst-invoices?financial_year=${year}`);
    if (res.success && res.data) setInvoices(Array.isArray(res.data.rows) ? res.data.rows : []);
  }, []);

  const loadSettings = useCallback(async (wid: string) => {
    const res = await apiClient<GstSettings | null>(`/v1/workspaces/${wid}/gst-settings`);
    if (res.success) setSettings(res.data ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (ws.success && Array.isArray(ws.data) && ws.data.length > 0) {
        const wid = ws.data[0].id;
        setWorkspaceId(wid);
        await Promise.all([loadSettings(wid), loadInvoices(wid, fy)]);
      }
      setLoading(false);
    })();
  }, [fy, loadInvoices, loadSettings]);

  const markPaid = async (id: string) => {
    if (!workspaceId) return;
    await apiClient(`/v1/workspaces/${workspaceId}/gst-invoices/${id}/paid`, { method: 'POST' });
    loadInvoices(workspaceId, fy);
  };

  const cancel = async (id: string) => {
    if (!workspaceId) return;
    if (!confirm('Cancel this invoice? Number will remain reserved.')) return;
    await apiClient(`/v1/workspaces/${workspaceId}/gst-invoices/${id}/cancel`, { method: 'POST' });
    loadInvoices(workspaceId, fy);
  };

  const downloadPdf = (id: string) => {
    if (!workspaceId) return;
    const token = localStorage.getItem('access_token');
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    fetch(`${base}/v1/workspaces/${workspaceId}/gst-invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const downloadCsv = () => {
    if (!workspaceId) return;
    const token = localStorage.getItem('access_token');
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    fetch(`${base}/v1/workspaces/${workspaceId}/gst-invoices/export.csv?financial_year=${fy}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gst-invoices-${fy}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const total = invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? i.total_paise : 0), 0);
  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_paise, 0);
  const outstanding = total - paid;

  return (
    <div className="space-y-6">
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      <section className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Finance</span>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">GST invoices</h1>
          <p className="text-white/40 text-sm mt-1">Tax-compliant invoices with Tally/Zoho export.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="input-nocturne text-xs py-2"
          >
            <option value="2025-26">FY 2025-26</option>
            <option value="2026-27">FY 2026-27</option>
            <option value="2027-28">FY 2027-28</option>
          </select>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2"
          >
            <SettingsIcon size={14} /> Settings
          </button>
          <button
            onClick={downloadCsv}
            disabled={invoices.length === 0}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2 disabled:opacity-40"
          >
            <Download size={14} /> Tally CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!settings}
            title={!settings ? 'Configure GST settings first' : ''}
            className="px-3 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[#b48af0] disabled:opacity-40"
          >
            <Plus size={14} /> New invoice
          </button>
        </div>
      </section>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <SummaryCard label="Total invoiced" value={rupees(total)} count={invoices.length} />
        <SummaryCard label="Paid" value={rupees(paid)} accent="text-[#a1faff]" />
        <SummaryCard label="Outstanding" value={rupees(outstanding)} accent="text-[#ffbf00]" />
      </div>

      {/* Table */}
      <div className="relative z-10">
        {loading ? (
          <p className="text-white/40 text-center py-12">Loading…</p>
        ) : !settings ? (
          <div className="glass-card p-8 rounded-xl border border-white/5 text-center">
            <FileText className="mx-auto text-white/30 mb-3" size={32} />
            <p className="text-white/60 mb-4">Configure your GST details to start issuing invoices.</p>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold"
            >
              Configure GST settings
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="glass-card p-8 rounded-xl border border-white/5 text-center">
            <FileText className="mx-auto text-white/30 mb-3" size={32} />
            <p className="text-white/50">No invoices in FY {fy} yet.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr className="text-left text-[10px] uppercase tracking-widest text-white/50">
                  <th className="px-4 py-3 font-bold">Invoice #</th>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Recipient</th>
                  <th className="px-4 py-3 font-bold">GSTIN</th>
                  <th className="px-4 py-3 font-bold text-right">Total</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{inv.issue_date}</td>
                    <td className="px-4 py-3 text-white/80 text-xs">{inv.recipient_name}</td>
                    <td className="px-4 py-3 text-white/50 text-xs font-mono">{inv.recipient_gstin ?? '—'}</td>
                    <td className="px-4 py-3 text-white font-bold text-xs text-right">{rupees(inv.total_paise)}</td>
                    <td className="px-4 py-3">
                      <StatusChip status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton title="Download PDF" onClick={() => downloadPdf(inv.id)}><Download size={12} /></IconButton>
                        {inv.status === 'issued' && (
                          <IconButton title="Mark paid" onClick={() => markPaid(inv.id)}><Check size={12} /></IconButton>
                        )}
                        {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                          <IconButton title="Cancel" onClick={() => cancel(inv.id)}><Trash2 size={12} /></IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSettings && workspaceId && (
        <SettingsDrawer
          workspaceId={workspaceId}
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => { setSettings(s); setShowSettings(false); }}
        />
      )}

      {showCreate && workspaceId && settings && (
        <CreateInvoiceDrawer
          workspaceId={workspaceId}
          settings={settings}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadInvoices(workspaceId, fy); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, count, accent = 'text-white' }: { label: string; value: string; count?: number; accent?: string }) {
  return (
    <div className="glass-card p-4 rounded-xl border border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">{label}</p>
      <p className={`text-2xl font-display font-extrabold tracking-tighter ${accent}`}>{value}</p>
      {count != null && <p className="text-[10px] text-white/40 mt-1">{count} invoice{count === 1 ? '' : 's'}</p>}
    </div>
  );
}

function StatusChip({ status }: { status: Invoice['status'] }) {
  const map: Record<Invoice['status'], string> = {
    draft: 'bg-white/5 text-white/60 border-white/10',
    issued: 'bg-[#c39bff]/15 text-[#c39bff] border-[#c39bff]/30',
    paid: 'bg-[#a1faff]/15 text-[#a1faff] border-[#a1faff]/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${map[status]}`}>
      {status}
    </span>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
    >
      {children}
    </button>
  );
}

// ─── Settings Drawer ──────────────────────────────────────────
function SettingsDrawer({
  workspaceId,
  initial,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  initial: GstSettings | null;
  onClose: () => void;
  onSaved: (s: GstSettings) => void;
}) {
  const [form, setForm] = useState<Partial<GstSettings>>(
    initial ?? {
      legal_name: '',
      gstin: '',
      pan: '',
      state_code: '',
      address_line1: '',
      city: '',
      state: '',
      pincode: '',
      default_sac_code: '998554',
      default_tax_rate: 18,
      invoice_prefix: 'INV',
      financial_year: currentFY(),
    },
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await apiClient<GstSettings>(`/v1/workspaces/${workspaceId}/gst-settings`, {
      method: 'PUT',
      body: JSON.stringify(form),
    });
    if (res.success && res.data) onSaved(res.data);
    setSaving(false);
  };

  return (
    <Drawer title="GST settings" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Legal name *" value={form.legal_name ?? ''} onChange={(v) => setForm({ ...form, legal_name: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="GSTIN" value={form.gstin ?? ''} onChange={(v) => setForm({ ...form, gstin: v })} placeholder="22AAAAA0000A1Z5" />
          <Input label="PAN" value={form.pan ?? ''} onChange={(v) => setForm({ ...form, pan: v })} placeholder="AAAAA0000A" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="State code" value={form.state_code ?? ''} onChange={(v) => setForm({ ...form, state_code: v })} placeholder="27 (Maharashtra)" />
          <Input label="Invoice prefix" value={form.invoice_prefix ?? ''} onChange={(v) => setForm({ ...form, invoice_prefix: v })} />
        </div>
        <Input label="Address" value={form.address_line1 ?? ''} onChange={(v) => setForm({ ...form, address_line1: v })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="City" value={form.city ?? ''} onChange={(v) => setForm({ ...form, city: v })} />
          <Input label="State" value={form.state ?? ''} onChange={(v) => setForm({ ...form, state: v })} />
          <Input label="Pincode" value={form.pincode ?? ''} onChange={(v) => setForm({ ...form, pincode: v })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Default SAC" value={form.default_sac_code ?? ''} onChange={(v) => setForm({ ...form, default_sac_code: v })} />
          <Input
            label="Tax rate %"
            value={String(form.default_tax_rate ?? '')}
            onChange={(v) => setForm({ ...form, default_tax_rate: Number(v) || 0 })}
          />
          <Input label="Financial year" value={form.financial_year ?? ''} onChange={(v) => setForm({ ...form, financial_year: v })} />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/70 hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !form.legal_name}
            className="px-4 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Create Invoice Drawer ────────────────────────────────────
function CreateInvoiceDrawer({
  workspaceId,
  settings,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  settings: GstSettings;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [recipient, setRecipient] = useState({
    recipient_name: '',
    recipient_gstin: '',
    recipient_address: '',
    recipient_state_code: '',
    recipient_email: '',
  });
  const [items, setItems] = useState<LineItemDraft[]>([
    { description: '', sac_code: settings.default_sac_code, quantity: 1, unit_price_rupees: '', tax_rate: Number(settings.default_tax_rate) },
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const updateItem = (i: number, patch: Partial<LineItemDraft>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { description: '', sac_code: settings.default_sac_code, quantity: 1, unit_price_rupees: '', tax_rate: Number(settings.default_tax_rate) },
    ]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotalPaise = items.reduce((s, it) => s + Math.round((Number(it.unit_price_rupees) || 0) * 100 * it.quantity), 0);
  const taxPaise = items.reduce(
    (s, it) => s + Math.round((Math.round((Number(it.unit_price_rupees) || 0) * 100 * it.quantity) * it.tax_rate) / 100),
    0,
  );
  const totalPaise = subtotalPaise + taxPaise;

  const canSubmit =
    recipient.recipient_name.trim().length > 0 &&
    items.length > 0 &&
    items.every((it) => it.description.trim() && Number(it.unit_price_rupees) > 0);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const payload = {
      ...recipient,
      recipient_gstin: recipient.recipient_gstin || null,
      recipient_address: recipient.recipient_address || null,
      recipient_state_code: recipient.recipient_state_code || null,
      recipient_email: recipient.recipient_email || null,
      notes: notes || null,
      line_items: items.map((it) => ({
        description: it.description,
        sac_code: it.sac_code,
        quantity: it.quantity,
        unit_price_paise: Math.round(Number(it.unit_price_rupees) * 100),
        tax_rate: it.tax_rate,
      })),
    };
    const res = await apiClient(`/v1/workspaces/${workspaceId}/gst-invoices`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success) onCreated();
    setSaving(false);
  };

  return (
    <Drawer title="New GST invoice" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2">Recipient</p>
          <div className="space-y-3">
            <Input label="Name *" value={recipient.recipient_name} onChange={(v) => setRecipient({ ...recipient, recipient_name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="GSTIN" value={recipient.recipient_gstin} onChange={(v) => setRecipient({ ...recipient, recipient_gstin: v })} />
              <Input label="State code" value={recipient.recipient_state_code} onChange={(v) => setRecipient({ ...recipient, recipient_state_code: v })} placeholder="27" />
            </div>
            <Input label="Email" value={recipient.recipient_email} onChange={(v) => setRecipient({ ...recipient, recipient_email: v })} />
            <Input label="Address" value={recipient.recipient_address} onChange={(v) => setRecipient({ ...recipient, recipient_address: v })} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Line items</p>
            <button onClick={addItem} className="text-[10px] font-bold text-[#c39bff] hover:underline flex items-center gap-1">
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-white/30 hover:text-red-400">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <Input label="Description *" value={it.description} onChange={(v) => updateItem(idx, { description: v })} placeholder="Artist booking fee for Corporate Summit 2026" />
                <div className="grid grid-cols-4 gap-2">
                  <Input label="SAC" value={it.sac_code} onChange={(v) => updateItem(idx, { sac_code: v })} />
                  <Input label="Qty" value={String(it.quantity)} onChange={(v) => updateItem(idx, { quantity: Number(v) || 0 })} />
                  <Input label="Unit ₹ *" value={it.unit_price_rupees} onChange={(v) => updateItem(idx, { unit_price_rupees: v })} />
                  <Input label="GST %" value={String(it.tax_rate)} onChange={(v) => updateItem(idx, { tax_rate: Number(v) || 0 })} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input-nocturne w-full resize-none text-sm"
            placeholder="Payment terms, bank details, etc."
          />
        </div>

        {/* Totals preview */}
        <div className="p-3 rounded-lg bg-[#c39bff]/5 border border-[#c39bff]/20 text-xs space-y-1">
          <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{rupees(subtotalPaise)}</span></div>
          <div className="flex justify-between text-white/60"><span>Tax</span><span>{rupees(taxPaise)}</span></div>
          <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10"><span>Total</span><span>{rupees(totalPaise)}</span></div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/70 hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="px-4 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40"
          >
            <ExternalLink size={12} /> {saving ? 'Issuing…' : 'Issue invoice'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Reusable primitives ──────────────────────────────────────
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[#0e0e0f] border-l border-white/10 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-nocturne w-full text-sm"
      />
    </label>
  );
}
