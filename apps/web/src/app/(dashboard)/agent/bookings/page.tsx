'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Calendar, MapPin, User, IndianRupee } from 'lucide-react';
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

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  inquiry: { bg: 'bg-blue-500/10', text: 'text-blue-300', dot: 'bg-blue-400' },
  quoted: { bg: 'bg-yellow-500/10', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  negotiating: { bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-400' },
  confirmed: { bg: 'bg-green-500/10', text: 'text-green-300', dot: 'bg-green-400' },
  pre_event: { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-400' },
  event_day: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  completed: { bg: 'bg-teal-500/10', text: 'text-teal-300', dot: 'bg-teal-400' },
  settled: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-300', dot: 'bg-red-400' },
  disputed: { bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-400' },
};

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES = ['inquiry', 'quoted', 'negotiating', 'confirmed', 'pre_event', 'event_day'];
const COMPLETED_STATUSES = ['completed', 'settled'];
const CANCELLED_STATUSES = ['cancelled'];

const BookingSkeleton = () => (
  <div className="bg-nocturne-surface rounded-2xl p-6 animate-pulse border border-white/10">
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="h-4 bg-gradient-to-r from-primary-400/20 to-transparent rounded w-48 mb-3" />
        <div className="h-3 bg-gradient-to-r from-primary-400/10 to-transparent rounded w-64" />
      </div>
      <div className="w-20 h-8 bg-gradient-to-r from-primary-400/20 to-transparent rounded" />
    </div>
  </div>
);

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

  return (
    <div className="space-y-8 relative">
      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">Booking Pipeline</h1>
          <p className="text-white/50 mt-3 flex gap-6 font-medium text-sm">
            <span><span className="text-[#c39bff] font-bold">{stats.active}</span> active</span>
            <span><span className="text-emerald-300 font-bold">{stats.completed}</span> completed</span>
            <span><span className="text-white/50 font-bold">{stats.total}</span> total</span>
          </p>
        </div>
        <button
          onClick={() => setShowConcierge(!showConcierge)}
          className="glass-card px-6 py-3 rounded-xl text-sm font-bold text-[#c39bff] border border-[#c39bff]/30 bg-[#c39bff]/5 hover:bg-[#c39bff]/15 hover:border-[#c39bff]/60 transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          New Booking
        </button>
      </div>

      {/* Concierge Booking Form */}
      {showConcierge && (
        <div className="bg-nocturne-surface rounded-2xl p-8 border border-white/10 animate-fade-in">
          <h2 className="text-2xl font-bold text-gradient-nocturne mb-6">Create New Booking</h2>
          <form onSubmit={handleConciergeBook} className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Artist ID *</label>
                <input
                  type="text"
                  required
                  value={conciergeForm.artist_id}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, artist_id: e.target.value })}
                  placeholder="Enter artist ID"
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Client Name *</label>
                <input
                  type="text"
                  required
                  value={conciergeForm.client_name}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, client_name: e.target.value })}
                  placeholder="Client name"
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Event Type</label>
                <input
                  type="text"
                  value={conciergeForm.event_type}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_type: e.target.value })}
                  placeholder="e.g., Wedding, Corporate"
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Event City</label>
                <input
                  type="text"
                  value={conciergeForm.event_city}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_city: e.target.value })}
                  placeholder="City name"
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Event Date</label>
                <input
                  type="date"
                  value={conciergeForm.event_date}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_date: e.target.value })}
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  value={conciergeForm.event_duration_hours}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, event_duration_hours: Number(e.target.value) })}
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Budget (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={conciergeForm.budget_paise / 100}
                  onChange={(e) => setConciergeForm({ ...conciergeForm, budget_paise: Number(e.target.value) * 100 })}
                  placeholder="0"
                  className="w-full bg-nocturne-surface bg-nocturne-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={conciergeLoading}
                className="flex-1 bg-gradient-nocturne text-white py-3 rounded-xl text-sm font-semibold hover:shadow-nocturne-glow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {conciergeLoading ? 'Creating...' : 'Create Booking'}
              </button>
              <button
                type="button"
                onClick={() => setShowConcierge(false)}
                className="flex-1 bg-nocturne-surface px-6 py-3 rounded-xl text-sm font-semibold text-nocturne-text-primary border border-white/10 hover:hover-glow transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => {
          const count = bookings.filter((b) => {
            if (f.key === 'all') return true;
            if (f.key === 'active') return ACTIVE_STATUSES.includes(b.status);
            if (f.key === 'completed') return COMPLETED_STATUSES.includes(b.status);
            if (f.key === 'cancelled') return CANCELLED_STATUSES.includes(b.status);
            return false;
          }).length;

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-gradient-nocturne text-white border border-primary-400/50'
                  : 'bg-nocturne-surface text-nocturne-text-primary border border-white/10 hover:hover-glow'
              }`}
            >
              {f.label}
              <span className={`text-xs ml-2 ${filter === f.key ? 'text-white/80' : 'text-nocturne-text-secondary'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Booking List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <BookingSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-nocturne-surface rounded-2xl p-12 text-center border border-white/10">
          <Calendar size={48} className="mx-auto text-nocturne-text-secondary/40 mb-4" />
          <p className="text-nocturne-text-secondary">No bookings in this status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const amount = b.final_amount_paise ?? b.quoted_amount_paise;
            const statusStyle = STATUS_STYLES[b.status] || STATUS_STYLES.inquiry;
            return (
              <Link
                key={b.id}
                href={`/agent/bookings/${b.id}`}
                className="bg-nocturne-surface rounded-2xl p-6 border border-white/10 hover:hover-glow transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Artist & Client */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-2 h-2 rounded-full ${statusStyle.dot} flex-shrink-0`} />
                      <h3 className="font-semibold text-nocturne-text-primary truncate group-hover:text-nocturne-accent transition-colors">
                        {b.artist_name}
                      </h3>
                      <span className="text-nocturne-text-secondary">·</span>
                      <span className="text-nocturne-text-secondary text-sm truncate">{b.client_name}</span>
                    </div>

                    {/* Event Details */}
                    <div className="flex flex-wrap gap-3 text-sm text-nocturne-text-secondary">
                      {b.event_type && (
                        <div className="flex items-center gap-1.5">
                          <User size={16} className="text-nocturne-text-secondary/60" />
                          {b.event_type}
                        </div>
                      )}
                      {b.event_city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={16} className="text-nocturne-text-secondary/60" />
                          {b.event_city}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar size={16} className="text-nocturne-text-secondary/60" />
                        {new Date(b.event_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Status & Amount */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    {amount != null && (
                      <div className="flex items-center gap-2 text-nocturne-accent font-semibold">
                        <IndianRupee size={16} />
                        {(amount / 100).toLocaleString('en-IN')}
                      </div>
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
