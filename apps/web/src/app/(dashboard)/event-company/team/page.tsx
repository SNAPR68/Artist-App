'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users, Crown, Shield, Trash2, X } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  role: string;
  joined_at: string;
  status?: 'active' | 'pending' | 'inactive';
}

interface Workspace { id: string; name: string }

const ROLES = [
  { value: 'owner', label: 'Owner', icon: Crown, color: 'text-[#ffbf00]', bg: 'bg-[#ffbf00]/10 border-[#ffbf00]/20' },
  { value: 'manager', label: 'Manager', icon: Shield, color: 'text-[#c39bff]', bg: 'bg-[#c39bff]/10 border-[#c39bff]/20' },
  { value: 'coordinator', label: 'Coordinator', icon: Users, color: 'text-[#a1faff]', bg: 'bg-[#a1faff]/10 border-[#a1faff]/20' },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return <span className="text-white/30 text-xs">{role}</span>;
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${r.color} ${r.bg}`}>
      <Icon size={9} /> {r.label}
    </span>
  );
}

export default function EventCompanyTeamPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('coordinator');
  const [phoneError, setPhoneError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [flash, setFlash] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = useCallback(async (wid: string) => {
    const res = await apiClient<WorkspaceMember[]>(`/v1/workspaces/${wid}/members`);
    if (res.success && Array.isArray(res.data)) setMembers(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (ws.success && Array.isArray(ws.data) && ws.data.length > 0) {
        const w = ws.data[0];
        setWorkspaceId(w.id);
        setWorkspaceName(w.name);
        await loadMembers(w.id);
      }
      setLoading(false);
    })();
  }, [loadMembers]);

  async function invite() {
    const cleaned = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setPhoneError('');
    setInviting(true);
    const res = await apiClient(`/v1/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ phone: cleaned, role }),
    });
    setInviting(false);
    if (res.success) {
      setPhone('');
      setRole('coordinator');
      setShowInvite(false);
      setFlash('Invitation sent.');
      setTimeout(() => setFlash(''), 3000);
      await loadMembers(workspaceId!);
    } else {
      setPhoneError((res.errors?.[0] as { message?: string })?.message ?? 'Failed to invite');
    }
  }

  async function updateRole(memberId: string, newRole: string) {
    setUpdatingId(memberId);
    await apiClient(`/v1/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    });
    setUpdatingId(null);
    setEditingId(null);
    await loadMembers(workspaceId!);
  }

  async function remove(userId: string) {
    if (!confirm('Remove this member?')) return;
    setRemovingId(userId);
    await apiClient(`/v1/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
    setRemovingId(null);
    await loadMembers(workspaceId!);
  }

  return (
    <div className="space-y-6">
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">
            {workspaceName || 'Workspace'}
          </span>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Team</h1>
          <p className="text-white/40 text-sm mt-1">Manage members and roles for your workspace.</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setPhoneError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold hover:bg-[#b48af0] transition-colors"
        >
          <UserPlus size={14} /> Invite member
        </button>
      </div>

      {flash && (
        <div className="glass-card rounded-xl p-4 border border-[#a1faff]/20 text-[#a1faff] text-sm font-medium">
          {flash}
        </div>
      )}

      {showInvite && (
        <div className="glass-card rounded-xl p-6 border border-white/10 space-y-4 max-w-lg relative">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-white">Invite team member</h2>
            <button onClick={() => setShowInvite(false)} className="text-white/30 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1.5 block">Mobile number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
              placeholder="9876543210"
              maxLength={10}
              className="input-nocturne w-full"
            />
            {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1.5 block">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-nocturne w-full"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/70 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={invite}
              disabled={inviting}
              className="px-4 py-2 bg-[#c39bff] text-black rounded-lg text-xs font-bold hover:bg-[#b48af0] disabled:opacity-40"
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
        </div>
      ) : members.length === 0 ? (
        <div className="glass-card rounded-xl p-10 border border-white/5 text-center">
          <Users className="mx-auto text-white/20 mb-3" size={36} />
          <p className="text-white/40 text-sm">No team members yet. Invite someone to get started.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <table className="nocturne-table w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-4 text-xs tracking-widest uppercase font-bold text-white/30">Member</th>
                <th className="text-left p-4 text-xs tracking-widest uppercase font-bold text-white/30">Role</th>
                <th className="text-left p-4 text-xs tracking-widest uppercase font-bold text-white/30">Joined</th>
                <th className="text-left p-4 text-xs tracking-widest uppercase font-bold text-white/30">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-white/5 group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#c39bff]/20 flex items-center justify-center text-[#c39bff] text-xs font-bold">
                        {(m.name || m.phone || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{m.name || '—'}</p>
                        {m.phone && <p className="text-white/30 text-xs">{m.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="input-nocturne text-xs py-1 pr-6 w-auto"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateRole(m.id, editRole)}
                          disabled={updatingId === m.id}
                          className="text-xs text-[#c39bff] hover:text-white font-bold disabled:opacity-40"
                        >
                          {updatingId === m.id ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-white/30 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(m.id); setEditRole(m.role); }}
                        className="hover:opacity-70 transition-opacity"
                        title="Change role"
                      >
                        <RoleBadge role={m.role} />
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-white/50 text-xs">
                    {new Date(m.joined_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="p-4">
                    {m.status === 'pending' ? (
                      <span className="text-[10px] uppercase tracking-widest bg-[#ffbf00]/10 text-[#ffbf00] border border-[#ffbf00]/20 px-2 py-0.5 rounded font-bold">
                        Pending
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest bg-[#a1faff]/10 text-[#a1faff] border border-[#a1faff]/20 px-2 py-0.5 rounded font-bold">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => remove(m.user_id)}
                      disabled={removingId === m.user_id}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all disabled:opacity-20"
                      title="Remove"
                    >
                      {removingId === m.user_id ? <div className="w-3 h-3 border border-red-400/50 border-t-red-400 rounded-full animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="glass-card rounded-xl p-5 border border-white/5 max-w-lg">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Role permissions</p>
        <div className="space-y-2">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const descs: Record<string, string> = {
              owner: 'Full access — billing, settings, member management',
              manager: 'Manage events, bookings, and proposals',
              coordinator: 'View and update events only',
            };
            return (
              <div key={r.value} className="flex items-center gap-3">
                <Icon size={13} className={r.color} />
                <span className={`text-xs font-bold w-20 ${r.color}`}>{r.label}</span>
                <span className="text-white/40 text-xs">{descs[r.value]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
