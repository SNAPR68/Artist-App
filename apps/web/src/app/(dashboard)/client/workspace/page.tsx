'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, Users, Calendar, Plus } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  company_type: string;
  member_count: number;
  event_count: number;
  created_at: string;
}

const COMPANY_TYPE_COLORS: Record<string, string> = {
  wedding_planner: 'bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-rose-600/5 border-rose-400/30 text-rose-300',
  corporate: 'bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-blue-600/5 border-blue-400/30 text-blue-300',
  college: 'bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-purple-600/5 border-purple-400/30 text-purple-300',
  festival: 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-600/5 border-amber-400/30 text-amber-300',
  agency: 'bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-teal-600/5 border-teal-400/30 text-teal-300',
};

export default function WorkspaceListPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('corporate');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    const res = await apiClient<Workspace[]>('/v1/workspaces');
    if (res.success) setWorkspaces(res.data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await apiClient<Workspace>('/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: formName, company_type: formType }),
    });
    setSubmitting(false);
    if (res.success) {
      setShowForm(false);
      setFormName('');
      setFormType('corporate');
      loadWorkspaces();
    } else {
      setError('Failed to create workspace. Please try again.');
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
          <section className="relative mb-2"><div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" /><h1 className="relative z-10 text-3xl font-display font-extrabold tracking-tighter text-white">Workspaces</h1></section>
          <p className="text-nocturne-text-secondary mt-1">Manage your event organizing spaces and teams</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="glass-card border border-nocturne-border-strong hover-glow px-4 py-2 rounded-lg text-sm font-medium text-nocturne-accent flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'New Workspace'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card border-nocturne-border rounded-xl p-6 space-y-4 animate-fade-in-up">
          <div>
            <label className="block text-sm font-medium text-nocturne-text-primary mb-2">Workspace Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. My Events Company"
              className="w-full px-4 py-2.5 bg-nocturne-base border border-nocturne-border rounded-lg text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-primary mb-2">Company Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-4 py-2.5 bg-nocturne-base border border-nocturne-border rounded-lg text-sm text-nocturne-text-primary focus:outline-none focus:ring-1 focus:ring-nocturne-primary"
            >
              <option value="corporate">Corporate</option>
              <option value="wedding_planner">Wedding Planner</option>
              <option value="college">College</option>
              <option value="festival">Festival</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-gradient-accent text-white rounded-lg text-sm font-medium hover-glow disabled:opacity-50 transition-all"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-nocturne-base text-nocturne-text-secondary rounded-lg text-sm font-medium hover:bg-nocturne-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {workspaces.length === 0 && !showForm ? (
        <div className="glass-card border-nocturne-border rounded-xl p-8 text-center animate-fade-in">
          <Building2 size={48} className="mx-auto mb-4 text-nocturne-accent/50" />
          <p className="text-nocturne-text-secondary mb-4">
            Create your first workspace to manage events, team members, and booking pipelines.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-nocturne-accent text-sm font-medium hover:text-nocturne-accent transition-colors"
          >
            Get Started →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/client/workspace/${ws.id}`}
              className="group glass-card border-nocturne-border rounded-xl p-6 hover-glow transition-all duration-300 animate-fade-in"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-display text-lg text-nocturne-text-primary group-hover:text-nocturne-accent transition-colors">{ws.name}</h3>
                  <p className="text-xs text-nocturne-text-secondary mt-1">/{ws.slug}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${COMPANY_TYPE_COLORS[ws.company_type] ?? 'bg-nocturne-surface/10 border border-nocturne-border text-nocturne-text-secondary'}`}
                >
                  {ws.company_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2 text-nocturne-text-secondary">
                  <Users size={16} className="text-nocturne-accent" />
                  <span>{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-nocturne-text-secondary">
                  <Calendar size={16} className="text-nocturne-accent" />
                  <span>{ws.event_count} event{ws.event_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
