'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ListCheck } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface Shortlist {
  id: string;
  name: string;
  created_at: string;
}

export default function ShortlistsPage() {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadShortlists();
  }, []);

  const loadShortlists = async () => {
    const res = await apiClient<Shortlist[]>('/v1/shortlists');
    if (res.success) setShortlists(res.data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const res = await apiClient<Shortlist>('/v1/shortlists', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.success) {
      setShortlists([res.data, ...shortlists]);
      setNewName('');
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shortlist?')) return;

    const res = await apiClient(`/v1/shortlists/${id}`, { method: 'DELETE' });
    if (res.success) {
      setShortlists(shortlists.filter((s) => s.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white flex items-center gap-2">
            <ListCheck size={32} className="text-[#a1faff]" />
            My Shortlists
          </h1>
          <p className="text-white/40 mt-1">Compare and organize artists for your events</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="glass-card border border-[#c39bff]/30 hover:border-[#c39bff]/50 hover:bg-white/5 px-4 py-2 rounded-lg text-sm font-medium text-[#c39bff] flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          New Shortlist
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <form onSubmit={handleCreate} className="glass-card border border-white/10 rounded-xl p-4 flex gap-2 animate-fade-in-up relative z-10">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Shortlist name (e.g., Wedding DJs)"
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
            autoFocus
          />
          <button type="submit" className="px-4 py-2.5 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] text-white rounded-lg text-sm font-medium hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] transition-all">
            Create
          </button>
          <button type="button" onClick={() => setCreating(false)} className="px-4 py-2.5 bg-white/5 text-white/60 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors border border-white/10">
            Cancel
          </button>
        </form>
      )}

      {/* Shortlist List */}
      {shortlists.length === 0 ? (
        <div className="glass-card border border-white/10 rounded-xl p-16 text-center relative z-10">
          <ListCheck size={48} className="mx-auto mb-4 text-[#a1faff]/50" />
          <p className="text-white/60 mb-2 font-medium">No shortlists yet</p>
          <p className="text-sm text-white/40">Create one to start comparing and organizing artists for your events</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 text-[#a1faff] text-sm font-medium hover:text-white transition-colors"
          >
            Create your first shortlist →
          </button>
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          {shortlists.map((sl) => (
            <Link
              key={sl.id}
              href={`/client/shortlists/${sl.id}`}
              className="group glass-card border border-white/10 rounded-xl p-5 flex items-center justify-between hover:border-white/20 hover:bg-white/5 transition-all duration-300 animate-fade-in"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-lg bg-[#c39bff]/20 border border-[#c39bff]/30 group-hover:bg-[#c39bff]/30 transition-colors flex-shrink-0">
                  <ListCheck size={18} className="text-[#c39bff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold text-white group-hover:text-[#c39bff] transition-colors truncate">{sl.name}</h3>
                  <p className="text-xs text-white/40">
                    Created {new Date(sl.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(sl.id);
                }}
                className="ml-4 p-2 text-white/40 hover:text-[#ff8b9a] hover:bg-[#ff8b9a]/10 rounded-lg transition-all"
                title="Delete shortlist"
              >
                <Trash2 size={18} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
