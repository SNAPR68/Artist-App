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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <ListCheck size={32} className="text-primary-400" />
            My Shortlists
          </h1>
          <p className="text-text-muted mt-1">Compare and organize artists for your events</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="glass-card border border-primary-500/30 hover-glow px-4 py-2 rounded-lg text-sm font-medium text-primary-300 flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          New Shortlist
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <form onSubmit={handleCreate} className="glass-card glass-border rounded-xl p-4 flex gap-2 animate-fade-in-up">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Shortlist name (e.g., Wedding DJs)"
            className="flex-1 px-4 py-2.5 bg-surface-bg border glass-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            autoFocus
          />
          <button type="submit" className="px-4 py-2.5 bg-gradient-accent text-white rounded-lg text-sm font-medium hover-glow transition-all">
            Create
          </button>
          <button type="button" onClick={() => setCreating(false)} className="px-4 py-2.5 bg-surface-base text-text-muted rounded-lg text-sm font-medium hover:bg-surface-card transition-colors">
            Cancel
          </button>
        </form>
      )}

      {/* Shortlist List */}
      {shortlists.length === 0 ? (
        <div className="glass-card glass-border rounded-xl p-16 text-center">
          <ListCheck size={48} className="mx-auto mb-4 text-primary-400/50" />
          <p className="text-text-muted mb-2 font-medium">No shortlists yet</p>
          <p className="text-sm text-text-secondary">Create one to start comparing and organizing artists for your events</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 text-primary-300 text-sm font-medium hover:text-primary-200 transition-colors"
          >
            Create your first shortlist →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {shortlists.map((sl) => (
            <Link
              key={sl.id}
              href={`/client/shortlists/${sl.id}`}
              className="group glass-card glass-border rounded-xl p-5 flex items-center justify-between hover-glow transition-all duration-300 animate-fade-in"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-lg bg-primary-500/20 border border-primary-400/30 group-hover:bg-primary-500/30 transition-colors flex-shrink-0">
                  <ListCheck size={18} className="text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-text-primary group-hover:text-primary-300 transition-colors truncate">{sl.name}</h3>
                  <p className="text-xs text-text-muted">
                    Created {new Date(sl.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(sl.id);
                }}
                className="ml-4 p-2 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
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
