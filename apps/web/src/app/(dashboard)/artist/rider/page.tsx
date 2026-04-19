'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Save, AlertCircle, Check, Speaker, Lightbulb, Music, Layers, Zap, Coffee, Car, MoreHorizontal } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface RiderItem {
  id: string;
  category: string;
  item_name: string;
  quantity: number;
  priority: 'must_have' | 'nice_to_have' | 'flexible';
  specifications?: string;
  alternatives?: string[];
  sort_order?: number;
}

interface Rider {
  id?: string;
  notes?: string;
  items: RiderItem[];
}

interface ArtistProfile { id: string }

const CATEGORIES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'sound', label: 'Sound', icon: Speaker },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb },
  { key: 'backline', label: 'Backline', icon: Music },
  { key: 'staging', label: 'Staging', icon: Layers },
  { key: 'power', label: 'Power', icon: Zap },
  { key: 'hospitality', label: 'Hospitality', icon: Coffee },
  { key: 'transport', label: 'Transport', icon: Car },
  { key: 'other', label: 'Other', icon: MoreHorizontal },
];

const PRIORITIES = [
  { key: 'must_have', label: 'Must have', color: 'bg-red-500/20 text-red-300' },
  { key: 'nice_to_have', label: 'Nice to have', color: 'bg-yellow-500/20 text-yellow-300' },
  { key: 'flexible', label: 'Flexible', color: 'bg-green-500/20 text-green-300' },
] as const;

export default function ArtistRiderPage() {
  const [artistId, setArtistId] = useState<string | null>(null);
  const [rider, setRider] = useState<Rider>({ items: [] });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<Partial<RiderItem>>({
    category: 'sound', item_name: '', quantity: 1, priority: 'must_have', specifications: '',
  });

  const loadRider = useCallback(async (id: string) => {
    const res = await apiClient<Rider>(`/v1/artists/${id}/rider`);
    if (res.success && res.data) {
      setRider(res.data);
      setNotes(res.data.notes ?? '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    apiClient<ArtistProfile>('/v1/artists/profile').then((res) => {
      if (res.success && res.data) {
        setArtistId(res.data.id);
        loadRider(res.data.id);
      } else {
        setLoading(false);
      }
    });
  }, [loadRider]);

  const saveNotes = async () => {
    setSavingNotes(true);
    setError(null);
    const res = await apiClient('/v1/artists/me/rider', {
      method: 'POST',
      body: JSON.stringify({ notes, hospitality_requirements: {}, travel_requirements: {} }),
    });
    if (res.success) {
      setSuccess('Rider notes saved');
      setTimeout(() => setSuccess(null), 2500);
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to save');
    }
    setSavingNotes(false);
  };

  const addItem = async () => {
    if (!newItem.item_name?.trim()) { setError('Item name required'); return; }
    const res = await apiClient<RiderItem>('/v1/artists/me/rider/items', {
      method: 'POST',
      body: JSON.stringify({
        category: newItem.category,
        item_name: newItem.item_name,
        quantity: newItem.quantity ?? 1,
        priority: newItem.priority,
        specifications: newItem.specifications || undefined,
        alternatives: [],
        sort_order: rider.items.length,
      }),
    });
    if (res.success && res.data) {
      setRider((r) => ({ ...r, items: [...r.items, res.data] }));
      setNewItem({ category: 'sound', item_name: '', quantity: 1, priority: 'must_have', specifications: '' });
      setShowAdd(false);
      setSuccess('Item added');
      setTimeout(() => setSuccess(null), 2000);
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to add');
    }
  };

  const deleteItem = async (id: string) => {
    const res = await apiClient(`/v1/artists/me/rider/items/${id}`, { method: 'DELETE' });
    if (res.success) {
      setRider((r) => ({ ...r, items: r.items.filter((i) => i.id !== id) }));
    }
  };

  if (loading) return <div className="p-8 text-white/50 text-sm">Loading rider…</div>;
  if (!artistId) return <div className="p-8 text-white/50 text-sm">Set up your artist profile first.</div>;

  const byCategory = CATEGORIES.map((c) => ({
    ...c, items: rider.items.filter((i) => i.category === c.key),
  }));

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Artist</p>
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white">Technical Rider</h1>
        <p className="text-white/50 text-sm">List of equipment, hospitality, and logistics requirements for your performances.</p>
      </header>

      {error && <div className="glass-card rounded-xl p-3 border border-red-500/20 text-red-300 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {success && <div className="glass-card rounded-xl p-3 border border-green-500/20 text-green-300 text-sm flex items-center gap-2"><Check size={14} /> {success}</div>}

      {/* Categories */}
      <div className="space-y-4">
        {byCategory.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.key} className="glass-card rounded-xl border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
                <Icon size={16} className="text-[#c39bff]" />
                <span className="text-sm font-bold text-white capitalize">{cat.label}</span>
                <span className="text-xs text-white/30 ml-auto">{cat.items.length}</span>
              </div>
              {cat.items.length === 0 ? (
                <p className="text-xs text-white/30 p-4 text-center">No items</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {cat.items.map((item) => {
                    const prio = PRIORITIES.find((p) => p.key === item.priority);
                    return (
                      <li key={item.id} className="px-5 py-3 flex items-center gap-3 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-white">{item.item_name}</p>
                            <span className="text-xs text-white/40">×{item.quantity}</span>
                            {prio && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${prio.color}`}>{prio.label}</span>}
                          </div>
                          {item.specifications && <p className="text-xs text-white/40 mt-0.5">{item.specifications}</p>}
                        </div>
                        <button onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Add item button */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-all text-sm">
          <Plus size={15} /> Add Rider Item
        </button>
      ) : (
        <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white">Add Item</h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={newItem.category}
              onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))}
              className="input-nocturne text-sm">
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={newItem.priority}
              onChange={(e) => setNewItem((n) => ({ ...n, priority: e.target.value as RiderItem['priority'] }))}
              className="input-nocturne text-sm">
              {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Item name (e.g. Shure SM58 mic)"
            value={newItem.item_name}
            onChange={(e) => setNewItem((n) => ({ ...n, item_name: e.target.value }))}
            className="input-nocturne w-full text-sm" />
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <input type="number" min={1} value={newItem.quantity}
              onChange={(e) => setNewItem((n) => ({ ...n, quantity: parseInt(e.target.value) || 1 }))}
              className="input-nocturne text-sm" />
            <input type="text" placeholder="Specifications (optional)"
              value={newItem.specifications}
              onChange={(e) => setNewItem((n) => ({ ...n, specifications: e.target.value }))}
              className="input-nocturne text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white/80">Cancel</button>
            <button onClick={addItem}
              className="flex-1 bg-[#c39bff] text-black py-2 rounded-lg text-sm font-bold hover:bg-[#b48af0]">
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <label className="text-xs text-white/50 uppercase tracking-widest font-bold block">General Notes</label>
        <textarea value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any general rider notes for event companies (e.g. prefer 2hr soundcheck, vegetarian catering only)..."
          rows={4}
          maxLength={2000}
          className="input-nocturne w-full text-sm resize-none" />
        <button onClick={saveNotes} disabled={savingNotes}
          className="flex items-center gap-2 bg-white/[0.06] border border-white/10 text-white/80 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/10 disabled:opacity-40">
          <Save size={13} /> {savingNotes ? 'Saving…' : 'Save Notes'}
        </button>
      </div>
    </div>
  );
}
