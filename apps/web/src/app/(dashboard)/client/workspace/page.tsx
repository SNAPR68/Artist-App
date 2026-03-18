'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  wedding_planner: 'bg-pink-100 text-pink-700',
  corporate: 'bg-blue-100 text-blue-700',
  college: 'bg-purple-100 text-purple-700',
  festival: 'bg-orange-100 text-orange-700',
  agency: 'bg-teal-100 text-teal-700',
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
        <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
        >
          {showForm ? 'Cancel' : 'Create Workspace'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Workspace Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. My Events Company"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Company Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="corporate">Corporate</option>
              <option value="wedding_planner">Wedding Planner</option>
              <option value="college">College</option>
              <option value="festival">Festival</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {workspaces.length === 0 && !showForm ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-2">
            Create your first workspace to manage events, team members, and booking pipelines.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-primary-500 text-sm font-medium"
          >
            Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/client/workspace/${ws.id}`}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{ws.name}</h3>
                  <p className="text-xs text-gray-400">/{ws.slug}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${COMPANY_TYPE_COLORS[ws.company_type] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {ws.company_type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</span>
                <span>{ws.event_count} event{ws.event_count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
