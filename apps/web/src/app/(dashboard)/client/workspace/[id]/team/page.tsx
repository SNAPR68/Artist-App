'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';

// ─── Types ────────────────────────────────────────────────────

interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  joined_at: string;
  status?: 'active' | 'pending' | 'inactive';
}

interface AddMemberForm {
  email: string;
  role: string;
}

// ─── Constants ─────────────────────────────────────────────────

const ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to workspace' },
  { value: 'manager', label: 'Manager', description: 'Can manage events and bookings' },
  { value: 'coordinator', label: 'Coordinator', description: 'Can view and update events' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-100 text-yellow-700',
  manager: 'bg-blue-100 text-blue-700',
  coordinator: 'bg-gray-100 text-gray-700',
  viewer: 'bg-gray-50 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-orange-100 text-orange-700',
  inactive: 'bg-gray-100 text-gray-600',
};

// ─── Page ─────────────────────────────────────────────────────

export default function WorkspaceTeamPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const [form, setForm] = useState<AddMemberForm>({
    email: '',
    role: 'coordinator',
  });

  // ─── Fetch Members ────────────────────────────────────────

  const fetchMembers = useCallback(() => {
    setLoading(true);
    apiClient<WorkspaceMember[]>(`/v1/workspaces/${workspaceId}/members`)
      .then((res: any) => {
        if (res.success) {
          setMembers(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient<WorkspaceMember>(`/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
        }),
      });

      if (res.success) {
        setForm({ email: '', role: 'coordinator' });
        setShowAddForm(false);
        setSuccess('Member added successfully!');
        fetchMembers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.errors?.[0]?.message ?? 'Failed to add member');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (memberId: string) => {
    if (!editRole) return;

    const res = await apiClient(`/v1/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role: editRole }),
    });

    if (res.success) {
      setEditingMemberId(null);
      setSuccess('Role updated successfully!');
      fetchMembers();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setRemovingMemberId(memberId);
    const res = await apiClient(`/v1/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });

    if (res.success) {
      setSuccess('Member removed successfully!');
      fetchMembers();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Failed to remove member');
    }
    setRemovingMemberId(null);
  };

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/client/workspace/${workspaceId}`}
            className="text-sm text-primary-500 hover:underline"
          >
            &larr; Back to Workspace
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Team Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage team members and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Member'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="member@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No team members yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-700">Name / Email</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-700">Role</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-700">Joined</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.name || member.email || 'Team Member'}
                        </p>
                        {member.email && member.name && (
                          <p className="text-xs text-gray-500">{member.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {editingMemberId === member.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateRole(member.id)}
                            className="text-xs bg-primary-500 text-white px-2 py-1 rounded hover:bg-primary-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMemberId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMemberId(member.id);
                            setEditRole(member.role);
                          }}
                          className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                            ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700'
                          }`}
                          title="Click to edit role"
                        >
                          {member.role}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          STATUS_COLORS[member.status ?? 'active'] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.status ?? 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(member.joined_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-start gap-2">
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[r.value]}`}
              >
                {r.label}
              </span>
              <p className="text-xs text-gray-600">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
