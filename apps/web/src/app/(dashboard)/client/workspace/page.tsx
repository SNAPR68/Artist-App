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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="flex items-center justify-between">
        <div>
          <div className="glass-card rounded-2xl p-8 border border-white/10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Client Dashboard</span>
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">Workspaces</h1>
              <p className="text-white/50 text-sm mt-2">Manage your event organizing spaces and teams</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="glass-card border border-[#c39bff]/30 hover:border-[#c39bff]/60 bg-[#c39bff]/10 hover:bg-[#c39bff]/20 px-6 py-3 rounded-xl text-sm font-bold text-[#c39bff] flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          {showForm ? 'Cancel' : 'New Workspace'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card border border-white/10 rounded-2xl p-8 space-y-5 animate-fade-in">
          <h2 className="text-xl font-display font-bold text-white">Create Workspace</h2>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#a1faff] block mb-3">Workspace Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. My Events Company"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
              required
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#a1faff] block mb-3">Company Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
            >
              <option value="corporate">Corporate</option>
              <option value="wedding_planner">Wedding Planner</option>
              <option value="college">College</option>
              <option value="festival">Festival</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          {error && <p className="text-sm text-[#ff6b9d]">{error}</p>}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white rounded-xl text-sm font-bold hover:shadow-[0_0_30px_rgba(195,155,255,0.3)] disabled:opacity-50 transition-all"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-white/5 text-white/70 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {workspaces.length === 0 && !showForm ? (
        <div className="glass-card border border-white/10 rounded-2xl p-16 text-center">
          <Building2 size={56} className="mx-auto mb-6 text-[#a1faff]/40" />
          <h3 className="text-xl font-display font-bold text-white mb-3">No Workspaces Yet</h3>
          <p className="text-white/50 mb-6">Create your first workspace to manage events, team members, and booking pipelines.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-[#c39bff] text-sm font-bold hover:text-[#a1faff] transition-colors"
          >
            Get Started →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/client/workspace/${ws.id}`}
              className="group glass-card border border-white/10 hover:border-[#c39bff]/40 rounded-2xl p-6 hover:shadow-[0_0_40px_rgba(195,155,255,0.15)] transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-bold text-white group-hover:text-[#c39bff] transition-colors">{ws.name}</h3>
                  <p className="text-xs text-white/40 mt-2">/{ws.slug}</p>
                </div>
                <span
                  className={`text-xs font-bold px-4 py-2 rounded-full ${COMPANY_TYPE_COLORS[ws.company_type] ?? 'bg-white/5 border border-white/10 text-white/50'}`}
                >
                  {ws.company_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex gap-6 text-sm pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/60">
                  <Users size={16} className="text-[#a1faff]" />
                  <span className="font-medium">{ws.member_count} {ws.member_count === 1 ? 'member' : 'members'}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar size={16} className="text-[#a1faff]" />
                  <span className="font-medium">{ws.event_count} {ws.event_count === 1 ? 'event' : 'events'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
