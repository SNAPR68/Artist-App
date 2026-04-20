'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Star, Trash2, Save, X } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import VoiceFillButton from '../../../../components/voice/VoiceFillButton';

interface Template {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  custom_header: string | null;
  custom_footer: string | null;
  terms_and_conditions: string | null;
  include_pricing: boolean;
  include_media: boolean;
  is_default: boolean;
  updated_at: string;
}

interface Workspace { id: string; name: string }

const EMPTY: Omit<Template, 'id' | 'workspace_id' | 'updated_at'> = {
  name: '',
  description: '',
  custom_header: '',
  custom_footer: '',
  terms_and_conditions: '',
  include_pricing: false,
  include_media: true,
  is_default: false,
};

export default function TemplatesPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (wid: string) => {
    setLoading(true);
    const res = await apiClient<Template[]>(`/v1/workspaces/${wid}/proposal-templates`);
    if (res.success) setTemplates(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (ws.success && Array.isArray(ws.data) && ws.data.length > 0) {
        setWorkspaceId(ws.data[0].id);
        await load(ws.data[0].id);
      } else {
        setLoading(false);
      }
    })();
  }, [load]);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (t: Template) => setEditing({ ...t });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!workspaceId || !editing || !editing.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      description: editing.description ?? null,
      custom_header: editing.custom_header ?? null,
      custom_footer: editing.custom_footer ?? null,
      terms_and_conditions: editing.terms_and_conditions ?? null,
      include_pricing: editing.include_pricing ?? false,
      include_media: editing.include_media ?? true,
      is_default: editing.is_default ?? false,
    };
    const url = editing.id
      ? `/v1/workspaces/${workspaceId}/proposal-templates/${editing.id}`
      : `/v1/workspaces/${workspaceId}/proposal-templates`;
    const res = await apiClient(url, {
      method: editing.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success) {
      setEditing(null);
      await load(workspaceId);
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!workspaceId) return;
    if (!confirm('Delete this template?')) return;
    await apiClient(`/v1/workspaces/${workspaceId}/proposal-templates/${id}`, { method: 'DELETE' });
    load(workspaceId);
  };

  return (
    <div className="space-y-6">
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      <section className="relative z-10 flex items-center justify-between">
        <div>
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Branding</span>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Proposal templates</h1>
          <p className="text-white/40 text-sm mt-1">Reusable presets for pitch decks — headers, footers, terms.</p>
        </div>
        {!editing && (
          <button
            onClick={startNew}
            className="px-3 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[#b48af0]"
          >
            <Plus size={14} /> New template
          </button>
        )}
      </section>

      {editing ? (
        <div className="glass-card rounded-xl p-6 border border-white/10 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white">
              {editing.id ? 'Edit template' : 'New template'}
            </h2>
            <div className="flex items-center gap-2">
              <VoiceFillButton
                formContext={{
                  page: 'proposal template editor',
                  fields: [
                    { name: 'name', label: 'Template name', type: 'text' },
                    { name: 'description', label: 'Description', type: 'text' },
                    { name: 'custom_header', label: 'Header text', type: 'text' },
                    { name: 'custom_footer', label: 'Footer text', type: 'text' },
                    { name: 'terms_and_conditions', label: 'Terms and conditions', type: 'text' },
                  ],
                }}
                onFieldUpdate={(fields) => setEditing((prev) => prev ? { ...prev, ...fields } : prev)}
              />
              <button onClick={cancel} className="text-white/40 hover:text-white" title="Cancel">
                <X size={18} />
              </button>
            </div>
          </div>

          <Field label="Name *">
            <input
              type="text"
              value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Corporate pitch deck"
              className="input-nocturne w-full"
              maxLength={120}
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="For Fortune 500 corporate events"
              className="input-nocturne w-full"
            />
          </Field>

          <Field label="Header text (appears before artist list)">
            <textarea
              value={editing.custom_header ?? ''}
              onChange={(e) => setEditing({ ...editing, custom_header: e.target.value })}
              rows={3}
              placeholder="Thank you for considering our roster…"
              className="input-nocturne w-full resize-none"
            />
          </Field>

          <Field label="Footer text (appears after artist list)">
            <textarea
              value={editing.custom_footer ?? ''}
              onChange={(e) => setEditing({ ...editing, custom_footer: e.target.value })}
              rows={3}
              placeholder="Quote valid for 30 days. Travel and stay billed at actuals."
              className="input-nocturne w-full resize-none"
            />
          </Field>

          <Field label="Terms & conditions (full page at the end)">
            <textarea
              value={editing.terms_and_conditions ?? ''}
              onChange={(e) => setEditing({ ...editing, terms_and_conditions: e.target.value })}
              rows={8}
              placeholder="1. Payment terms…&#10;2. Cancellation policy…&#10;3. Force majeure…"
              className="input-nocturne w-full resize-none font-mono text-xs"
            />
          </Field>

          <div className="flex flex-wrap gap-4 pt-2">
            <Checkbox
              label="Include pricing in proposal"
              checked={editing.include_pricing ?? false}
              onChange={(v) => setEditing({ ...editing, include_pricing: v })}
            />
            <Checkbox
              label="Include media thumbnails"
              checked={editing.include_media ?? true}
              onChange={(v) => setEditing({ ...editing, include_media: v })}
            />
            <Checkbox
              label="Set as default template"
              checked={editing.is_default ?? false}
              onChange={(v) => setEditing({ ...editing, is_default: v })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              onClick={cancel}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/70 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !editing.name?.trim()}
              className="px-4 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[#b48af0] disabled:opacity-40"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </div>
      ) : loading ? (
        <p className="text-white/40 text-center py-12">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="glass-card p-10 rounded-xl border border-[#c39bff]/20 text-center relative z-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#c39bff]/15 flex items-center justify-center mb-4">
              <FileText className="text-[#c39bff]" size={22} />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-1">Build your first proposal template</h3>
            <p className="text-white/50 text-sm mb-6">
              Save your standard intro, terms, payment schedule, and cancellation policy once — auto-apply to every pitch deck.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-6 text-left">
              {[
                { label: 'Corporate', desc: 'Pvt. Ltd. clients' },
                { label: 'Weddings', desc: 'Family events' },
                { label: 'Colleges', desc: 'Fests & festivals' },
              ].map((ex) => (
                <div key={ex.label} className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="text-xs font-semibold text-white">{ex.label}</div>
                  <div className="text-[10px] text-white/40">{ex.desc}</div>
                </div>
              ))}
            </div>
            <button
              onClick={startNew}
              className="px-4 py-2.5 bg-[#c39bff] text-black rounded-lg text-sm font-bold inline-flex items-center gap-2 hover:bg-[#b48af0] transition-colors"
            >
              <Plus size={14} /> Create template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {templates.map((t) => (
            <div key={t.id} className="glass-card p-5 rounded-xl border border-white/10 group">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText size={14} className="text-[#c39bff] shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                  {t.is_default && (
                    <span className="text-[9px] uppercase tracking-widest bg-[#ffbf00]/20 text-[#ffbf00] border border-[#ffbf00]/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Star size={9} /> Default
                    </span>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {t.description && (
                <p className="text-xs text-white/50 mb-3 line-clamp-2">{t.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.include_pricing && <Chip>Pricing</Chip>}
                {t.include_media && <Chip>Media</Chip>}
                {t.terms_and_conditions && <Chip>Terms</Chip>}
              </div>
              <button
                onClick={() => startEdit(t)}
                className="text-xs font-bold text-[#c39bff] hover:underline"
              >
                Edit template →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded accent-[#c39bff]"
      />
      {label}
    </label>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] uppercase tracking-widest bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 rounded">
      {children}
    </span>
  );
}
