'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
        <h1 className="text-2xl font-bold text-gray-900">My Shortlists</h1>
        <button
          onClick={() => setCreating(true)}
          className="text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
        >
          New Shortlist
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 p-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Shortlist name (e.g., Wedding DJs)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
            Create
          </button>
          <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-gray-500 text-sm">
            Cancel
          </button>
        </form>
      )}

      {/* Shortlist List */}
      {shortlists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-2">No shortlists yet</p>
          <p className="text-sm text-gray-400">Create one to start comparing artists</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shortlists.map((sl) => (
            <div
              key={sl.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:border-primary-300 transition-colors"
            >
              <Link href={`/client/shortlists/${sl.id}`} className="flex-1">
                <h3 className="font-medium text-gray-900">{sl.name}</h3>
                <p className="text-xs text-gray-400">
                  Created {new Date(sl.created_at).toLocaleDateString('en-IN')}
                </p>
              </Link>
              <button
                onClick={() => handleDelete(sl.id)}
                className="text-sm text-red-400 hover:text-red-600 ml-4"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
