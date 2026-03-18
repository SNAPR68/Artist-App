'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  company_type: string;
  created_at: string;
}

interface PipelineBooking {
  id: string;
  artist_name: string;
  event_type: string;
  event_date: string;
  status: string;
  quoted_amount_paise?: number;
  final_amount_paise?: number;
}

interface WorkspaceEvent {
  id: string;
  name: string;
  event_date: string;
  city: string;
  venue?: string;
  status: string;
  guest_count?: number;
  budget_min_paise?: number;
  budget_max_paise?: number;
  booking_count: number;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  role: string;
  joined_at: string;
}

type TabKey = 'pipeline' | 'events' | 'team';

const PIPELINE_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'inquiry', label: 'Inquiry', color: 'bg-blue-100 border-blue-200' },
  { key: 'quoted', label: 'Quoted', color: 'bg-yellow-100 border-yellow-200' },
  { key: 'confirmed', label: 'Confirmed', color: 'bg-green-100 border-green-200' },
  { key: 'pre_event', label: 'Pre-Event', color: 'bg-purple-100 border-purple-200' },
  { key: 'completed', label: 'Completed', color: 'bg-teal-100 border-teal-200' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 border-red-200' },
];

const EVENT_STATUS_COLORS: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-100 text-yellow-700',
  manager: 'bg-blue-100 text-blue-700',
  coordinator: 'bg-gray-100 text-gray-700',
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [pipeline, setPipeline] = useState<PipelineBooking[]>([]);
  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('pipeline');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    apiClient<WorkspaceDetail>(`/v1/workspaces/${workspaceId}`)
      .then((res) => {
        if (res.success) setWorkspace(res.data);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    setTabLoading(true);
    if (activeTab === 'pipeline') {
      apiClient<PipelineBooking[]>(`/v1/workspaces/${workspaceId}/pipeline`)
        .then((res) => { if (res.success) setPipeline(res.data); })
        .finally(() => setTabLoading(false));
    } else if (activeTab === 'events') {
      apiClient<WorkspaceEvent[]>(`/v1/workspaces/${workspaceId}/events`)
        .then((res) => { if (res.success) setEvents(res.data); })
        .finally(() => setTabLoading(false));
    } else if (activeTab === 'team') {
      apiClient<WorkspaceMember[]>(`/v1/workspaces/${workspaceId}/members`)
        .then((res) => { if (res.success) setMembers(res.data); })
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!workspace) {
    return <p className="text-center py-10 text-gray-500">Workspace not found</p>;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'events', label: 'Events' },
    { key: 'team', label: 'Team' },
  ];

  const groupedPipeline: Record<string, PipelineBooking[]> = {};
  PIPELINE_COLUMNS.forEach((col) => { groupedPipeline[col.key] = []; });
  pipeline.forEach((b) => {
    if (groupedPipeline[b.status]) {
      groupedPipeline[b.status].push(b);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/client/workspace" className="text-sm text-primary-500 hover:underline">
            &larr; Back to Workspaces
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{workspace.name}</h1>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {tabLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <>
          {/* Pipeline Tab */}
          {activeTab === 'pipeline' && (
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {PIPELINE_COLUMNS.map((col) => (
                  <div key={col.key} className="w-64 flex-shrink-0">
                    <div className={`rounded-t-lg px-3 py-2 text-sm font-semibold text-gray-700 ${col.color}`}>
                      {col.label}
                      <span className="ml-1 text-xs text-gray-500">({groupedPipeline[col.key].length})</span>
                    </div>
                    <div className="space-y-2 mt-2">
                      {groupedPipeline[col.key].length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No bookings</p>
                      ) : (
                        groupedPipeline[col.key].map((b) => (
                          <Link
                            key={b.id}
                            href={`/client/bookings/${b.id}`}
                            className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-primary-300 transition-colors"
                          >
                            <p className="font-medium text-sm text-gray-900">{b.artist_name}</p>
                            <p className="text-xs text-gray-500 mt-1">{b.event_type}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {new Date(b.event_date).toLocaleDateString('en-IN')}
                              </span>
                              {(b.final_amount_paise ?? b.quoted_amount_paise) && (
                                <span className="text-xs font-medium text-gray-700">
                                  ₹{((b.final_amount_paise ?? b.quoted_amount_paise ?? 0) / 100).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No events in this workspace yet.</p>
                </div>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{evt.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(evt.event_date).toLocaleDateString('en-IN')} &middot; {evt.city}
                          {evt.venue && ` &middot; ${evt.venue}`}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${EVENT_STATUS_COLORS[evt.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {evt.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 mt-2">
                      {evt.guest_count != null && <span>{evt.guest_count} guests</span>}
                      {evt.budget_min_paise != null && evt.budget_max_paise != null && (
                        <span>
                          Budget: ₹{(evt.budget_min_paise / 100).toLocaleString('en-IN')} &ndash; ₹{(evt.budget_max_paise / 100).toLocaleString('en-IN')}
                        </span>
                      )}
                      <span>{evt.booking_count} booking{evt.booking_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No team members yet.</p>
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{m.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-700'}`}>
                          {m.role}
                        </span>
                      </div>
                      {m.phone && <p className="text-sm text-gray-500 mt-0.5">{m.phone}</p>}
                    </div>
                    <span className="text-xs text-gray-400">
                      Joined {new Date(m.joined_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
