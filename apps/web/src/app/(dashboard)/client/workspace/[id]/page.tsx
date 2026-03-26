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
  event_city?: string;
  city?: string;
  venue?: string;
  event_type?: string;
  status: string;
  guest_count?: number;
  budget_min_paise?: number;
  budget_max_paise?: number;
  booking_count?: number;
  client_name?: string;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  role: string;
  joined_at: string;
}

interface CreateEventForm {
  name: string;
  event_date: string;
  event_city: string;
  event_type: string;
  venue: string;
  guest_count: string;
  budget_min: string;
  budget_max: string;
  notes: string;
  client_name: string;
  client_phone: string;
}

const EMPTY_EVENT_FORM: CreateEventForm = {
  name: '', event_date: '', event_city: '', event_type: 'wedding',
  venue: '', guest_count: '', budget_min: '', budget_max: '',
  notes: '', client_name: '', client_phone: '',
};

const EVENT_TYPES = [
  'wedding', 'corporate', 'concert', 'house_party', 'college_fest',
  'birthday', 'reception', 'sangeet', 'mehendi', 'engagement', 'other',
];

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
  planning: 'bg-blue-100 text-nocturne-info',
  confirmed: 'bg-green-100 text-nocturne-success',
  completed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-nocturne-error',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-100 text-nocturne-warning',
  manager: 'bg-blue-100 text-nocturne-info',
  coordinator: 'bg-nocturne-surface text-nocturne-text-secondary',
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
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState<CreateEventForm>(EMPTY_EVENT_FORM);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createError, setCreateError] = useState('');

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
      apiClient<{ bookings: PipelineBooking[]; state_counts: Record<string, number>; pagination: unknown }>(`/v1/workspaces/${workspaceId}/pipeline`)
        .then((res) => { if (res.success) setPipeline(Array.isArray(res.data) ? res.data : res.data?.bookings ?? []); })
        .finally(() => setTabLoading(false));
    } else if (activeTab === 'events') {
      apiClient<{ events: WorkspaceEvent[] }>(`/v1/workspaces/${workspaceId}/events`)
        .then((res) => { if (res.success) setEvents(Array.isArray(res.data) ? res.data : res.data?.events ?? []); })
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
    return <p className="text-center py-10 text-nocturne-text-tertiary">Workspace not found</p>;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'events', label: 'Events' },
    { key: 'team', label: 'Team' },
  ];

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingEvent(true);
    setCreateError('');
    try {
      const body: Record<string, unknown> = {
        name: eventForm.name,
        event_date: eventForm.event_date,
        event_city: eventForm.event_city,
        event_type: eventForm.event_type,
      };
      if (eventForm.venue) body.venue = eventForm.venue;
      if (eventForm.guest_count) body.guest_count = parseInt(eventForm.guest_count, 10);
      if (eventForm.budget_min) body.budget_min_paise = Math.round(parseFloat(eventForm.budget_min) * 100);
      if (eventForm.budget_max) body.budget_max_paise = Math.round(parseFloat(eventForm.budget_max) * 100);
      if (eventForm.notes) body.notes = eventForm.notes;
      if (eventForm.client_name) body.client_name = eventForm.client_name;
      if (eventForm.client_phone) body.client_phone = eventForm.client_phone;

      const res = await apiClient(`/v1/workspaces/${workspaceId}/events`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.success) {
        setShowCreateEvent(false);
        setEventForm(EMPTY_EVENT_FORM);
        // Reload events
        const eventsRes = await apiClient<{ events: WorkspaceEvent[] }>(`/v1/workspaces/${workspaceId}/events`);
        if (eventsRes.success) setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data?.events ?? []);
      } else {
        setCreateError((res as { errors?: { message?: string }[] }).errors?.[0]?.message || 'Failed to create event');
      }
    } catch {
      setCreateError('Something went wrong. Please try again.');
    } finally {
      setCreatingEvent(false);
    }
  };

  const groupedPipeline: Record<string, PipelineBooking[]> = {};
  PIPELINE_COLUMNS.forEach((col) => { groupedPipeline[col.key] = []; });
  pipeline.forEach((b) => {
    if (groupedPipeline[b.status]) {
      groupedPipeline[b.status].push(b);
    }
  });

  return (
    <div className="space-y-6">
      {/* ─── Cinematic Bento Header ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <Link href="/client/workspace" className="text-sm text-[#c39bff] hover:underline mb-2 inline-block">
              &larr; Back to Workspaces
            </Link>
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Workspace</span>
            <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white mb-1">{workspace.name}</h1>
            <p className="text-white/40 text-sm">Manage events, bookings, and team for this workspace</p>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: `/client/workspace/${workspaceId}/team`, label: 'Team' },
              { href: `/client/workspace/${workspaceId}/analytics`, label: 'Analytics' },
              { href: `/client/workspace/${workspaceId}/presentations`, label: 'Presentations' },
              { href: `/client/workspace/${workspaceId}/settings`, label: 'Settings' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs glass-card bg-white/5 border border-white/5 text-white/60 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-all text-center font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-[#c39bff] text-[#a1faff] bg-white/5'
                : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'
            } rounded-t-lg`}
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
                    <div className={`rounded-t-lg px-3 py-2 text-sm font-semibold text-nocturne-text-secondary ${col.color}`}>
                      {col.label}
                      <span className="ml-1 text-xs text-nocturne-text-tertiary">({groupedPipeline[col.key].length})</span>
                    </div>
                    <div className="space-y-2 mt-2">
                      {groupedPipeline[col.key].length === 0 ? (
                        <p className="text-xs text-nocturne-text-tertiary text-center py-4">No bookings</p>
                      ) : (
                        groupedPipeline[col.key].map((b) => (
                          <Link
                            key={b.id}
                            href={`/client/bookings/${b.id}`}
                            className="block bg-nocturne-surface border border-nocturne-border-subtle rounded-lg p-3 hover:border-primary-300 transition-colors"
                          >
                            <p className="font-medium text-sm text-nocturne-text-primary">{b.artist_name}</p>
                            <p className="text-xs text-nocturne-text-tertiary mt-1">{b.event_type}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-nocturne-text-tertiary">
                                {new Date(b.event_date).toLocaleDateString('en-IN')}
                              </span>
                              {(b.final_amount_paise ?? b.quoted_amount_paise) && (
                                <span className="text-xs font-medium text-nocturne-text-secondary">
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
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="bg-nocturne-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-nocturne-primary transition-colors"
                >
                  + Add Event
                </button>
              </div>

              {/* Create Event Modal */}
              {showCreateEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-nocturne-surface rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-nocturne-border-subtle">
                      <h2 className="text-lg font-semibold text-nocturne-text-primary">Create New Event</h2>
                      <button onClick={() => setShowCreateEvent(false)} className="text-nocturne-text-tertiary hover:text-nocturne-text-secondary text-xl">&times;</button>
                    </div>
                    <form onSubmit={handleCreateEvent} className="p-5 space-y-4">
                      {createError && (
                        <div className="bg-nocturne-error/15 text-nocturne-error text-sm p-3 rounded-lg">{createError}</div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Event Name *</label>
                        <input
                          required
                          value={eventForm.name}
                          onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                          className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                          placeholder="e.g., Sharma Wedding Reception"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Event Date *</label>
                          <input
                            required
                            type="date"
                            value={eventForm.event_date}
                            onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Event Type *</label>
                          <select
                            required
                            value={eventForm.event_type}
                            onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none capitalize"
                          >
                            {EVENT_TYPES.map((t) => (
                              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">City *</label>
                          <input
                            required
                            value={eventForm.event_city}
                            onChange={(e) => setEventForm({ ...eventForm, event_city: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                            placeholder="Mumbai"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Venue</label>
                          <input
                            value={eventForm.venue}
                            onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                            placeholder="Taj Palace"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Guest Count</label>
                          <input
                            type="number"
                            min="1"
                            value={eventForm.guest_count}
                            onChange={(e) => setEventForm({ ...eventForm, guest_count: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                            placeholder="200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Client Name</label>
                          <input
                            value={eventForm.client_name}
                            onChange={(e) => setEventForm({ ...eventForm, client_name: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                            placeholder="Mr. Sharma"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Budget Min (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={eventForm.budget_min}
                            onChange={(e) => setEventForm({ ...eventForm, budget_min: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                            placeholder="50000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Budget Max (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={eventForm.budget_max}
                            onChange={(e) => setEventForm({ ...eventForm, budget_max: e.target.value })}
                            className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                            placeholder="200000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Notes</label>
                        <textarea
                          rows={2}
                          value={eventForm.notes}
                          onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                          className="w-full border border-nocturne-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none resize-none"
                          placeholder="Any special requirements..."
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateEvent(false)}
                          className="px-4 py-2 text-sm text-nocturne-text-secondary bg-nocturne-surface rounded-lg hover:bg-nocturne-surface-2 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingEvent}
                          className="px-4 py-2 text-sm text-white bg-nocturne-primary rounded-lg hover:bg-nocturne-primary transition-colors disabled:opacity-50"
                        >
                          {creatingEvent ? 'Creating...' : 'Create Event'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {events.length === 0 ? (
                <div className="bg-nocturne-base border border-nocturne-border-subtle rounded-lg p-8 text-center">
                  <p className="text-nocturne-text-tertiary">No events in this workspace yet.</p>
                  <p className="text-sm text-nocturne-text-tertiary mt-1">Click &quot;Add Event&quot; to create your first event.</p>
                </div>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} className="bg-nocturne-surface border border-nocturne-border-subtle rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-nocturne-text-primary">{evt.name}</h3>
                        <p className="text-sm text-nocturne-text-tertiary">
                          {new Date(evt.event_date).toLocaleDateString('en-IN')} &middot; {evt.event_city || evt.city || ''}
                          {evt.venue && ` · ${evt.venue}`}
                          {evt.event_type && ` · ${evt.event_type}`}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${EVENT_STATUS_COLORS[evt.status] ?? 'bg-nocturne-surface text-nocturne-text-secondary'}`}
                      >
                        {evt.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-nocturne-text-tertiary mt-2">
                      {evt.guest_count != null && <span>{evt.guest_count} guests</span>}
                      {evt.budget_min_paise != null && evt.budget_max_paise != null && (
                        <span>
                          Budget: ₹{(evt.budget_min_paise / 100).toLocaleString('en-IN')} &ndash; ₹{(evt.budget_max_paise / 100).toLocaleString('en-IN')}
                        </span>
                      )}
                      {evt.booking_count != null && <span>{evt.booking_count} booking{evt.booking_count !== 1 ? 's' : ''}</span>}
                      {evt.client_name && <span>{evt.client_name}</span>}
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
                <div className="bg-nocturne-base border border-nocturne-border-subtle rounded-lg p-8 text-center">
                  <p className="text-nocturne-text-tertiary">No team members yet.</p>
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="bg-nocturne-surface border border-nocturne-border-subtle rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-nocturne-text-primary">{m.name || m.role || 'Team Member'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] ?? 'bg-nocturne-surface text-nocturne-text-secondary'}`}>
                          {m.role}
                        </span>
                      </div>
                      {m.phone && <p className="text-sm text-nocturne-text-tertiary mt-0.5">{m.phone}</p>}
                    </div>
                    <span className="text-xs text-nocturne-text-tertiary">
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
