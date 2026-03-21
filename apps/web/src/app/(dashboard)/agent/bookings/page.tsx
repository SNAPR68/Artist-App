'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface AgentBooking {
  id: string;
  artist_name: string;
  client_name: string;
  event_type: string;
  event_city: string;
  event_date: string;
  status: string;
  final_amount_paise?: number;
  quoted_amount_paise?: number;
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  quoted: 'bg-yellow-100 text-yellow-700',
  negotiating: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  pre_event: 'bg-purple-100 text-purple-700',
  event_day: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-teal-100 text-teal-700',
  settled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  disputed: 'bg-orange-100 text-orange-700',
};

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES = ['inquiry', 'quoted', 'negotiating', 'confirmed', 'pre_event', 'event_day'];
const COMPLETED_STATUSES = ['completed', 'settled'];
const CANCELLED_STATUSES = ['cancelled'];

export default function AgentBookingsPage() {
  const [bookings, setBookings] = useState<AgentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showConcierge, setShowConcierge] = useState(false);
  const [conciergeForm, setConciergeForm] = useState({
    artist_id: '',
    client_name: '',
    event_type: '',
    event_city: '',
    event_date: '',
    event_duration_hours: 2,
    budget_paise: 0,
  });
  const [conciergeLoading, setConciergeLoading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    const res = await apiClient<AgentBooking[]>('/v1/bookings?role=agent');
    if (res.success) setBookings(res.data);
    setLoading(false);
  };

  const handleConciergeBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeForm.artist_id || !conciergeForm.client_name) return;

    setConciergeLoading(true);
    const res = await apiClient('/v1/concierge/book', {
      method: 'POST',
      body: JSON.stringify(conciergeForm),
    });

    if (res.success) {
      setConciergeForm({
        artist_id: '',
        client_name: '',
        event_type: '',
        event_city: '',
        event_date: '',
        event_duration_hours: 2,
        budget_paise: 0,
      });
      setShowConcierge(false);
      loadBookings();
    }
    setConciergeLoading(false);
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ACTIVE_STATUSES.includes(b.status);
    if (filter === 'completed') return COMPLETED_STATUSES.includes(b.status);
    if (filter === 'cancelled') return CANCELLED_STATUSES.includes(b.status);
    return true;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const stats = {
    active: bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length,
    completed: bookings.filter((b) => COMPLETED_STATUSES.includes(b.status)).length,
    total: bookings.length,
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
          <h1 className="text-2xl font-bold text-gray-900">Booking Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">{stats.active} active · {stats.completed} completed</p>
        </div>
        <button
          onClick={() => setShowConcierge(!showConcierge)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
        >
          {showConcierge ? 'Cancel' : '+ New Booking'}
        </button>
      </div>

      {/* Concierge Booking Form */}
      {showConcierge && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Booking</h2>
          <form onSubmit={handleConciergeBook} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Artist ID *</label>
                <input
                  type="text"
                  required
                  value={conciergeForm.artist_id}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, artist_id: e.target.value })}
                  placeholder="Artist ID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={conciergeForm.client_name}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, client_name: e.target.value })}
                  placeholder="Client name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <input
                  type="text"
                  value={conciergeForm.event_type}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_type: e.target.value })}
                  placeholder="e.g., Wedding, Corporate"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event City</label>
                <input
                  type="text"
                  value={conciergeForm.event_city}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_city: e.target.value })}
                  placeholder="City"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={conciergeForm.event_date}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  value={conciergeForm.event_duration_hours}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_duration_hours: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={conciergeForm.budget_paise / 100}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, budget_paise: Number(e.target.value) * 100 })}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={conciergeLoading}
                className="flex-1 bg-primary-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {conciergeLoading ? 'Creating...' : 'Create Booking'}
              </button>
              <button
                type="button"
                onClick={() => setShowConcierge(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === f.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
            <span className="text-xs text-gray-400 ml-1">
              ({bookings.filter((b) => {
                if (f.key === 'all') return true;
                if (f.key === 'active') return ACTIVE_STATUSES.includes(b.status);
                if (f.key === 'completed') return COMPLETED_STATUSES.includes(b.status);
                if (f.key === 'cancelled') return CANCELLED_STATUSES.includes(b.status);
                return false;
              }).length})
            </span>
          </button>
        ))}
      </div>

      {/* Booking List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No bookings in this status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const amount = b.final_amount_paise ?? b.quoted_amount_paise;
            return (
              <Link
                key={b.id}
                href={`/agent/bookings/${b.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{b.artist_name}</h3>
                      <span className="text-gray-400 text-sm">&middot;</span>
                      <span className="text-sm text-gray-500">{b.client_name}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {b.event_type} {b.event_type && '·'} {b.event_city} · {new Date(b.event_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    {amount != null && (
                      <span className="text-sm font-medium text-gray-700">
                        ₹{(amount / 100).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
