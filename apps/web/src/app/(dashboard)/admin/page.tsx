'use client';

import { Fragment, useEffect, useState, useMemo } from 'react';
import { Users, Calendar, CreditCard, Shield, BarChart3 } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

type Tab = 'overview' | 'users' | 'bookings' | 'payments' | 'disputes' | 'venues' | 'intelligence';

interface DisputeRecord {
  id: string;
  review_id: string;
  reason: string;
  status: string;
  resolution: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface VenueRecord {
  id: string;
  name: string;
  city: string;
  venue_type: string;
  capacity: number;
}

interface VenueIssueRecord {
  id: string;
  venue_id: string;
  issue_type: string;
  description: string;
  is_verified: boolean;
  created_at: string;
}

interface SeasonalCurveRecord {
  city: string;
  month: number;
  demand_classification: string;
  avg_fill_rate: number;
  yoy_trend_pct: number | null;
}

interface PlatformStats {
  users: { total: number; artists: number; clients: number; new_this_week: number };
  bookings: { total: number; confirmed: number; completed: number; cancelled: number };
  verified_artists: number;
}

interface UserRecord {
  id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  stage_name?: string;
  base_city?: string;
  is_verified?: boolean;
  trust_score?: number;
  total_bookings?: number;
  company_name?: string;
}

interface BookingRecord {
  id: string;
  status: string;
  event_type: string;
  event_city: string;
  event_date: string;
  final_amount_paise: number;
  artist_stage_name: string;
}

interface PaymentRecord {
  id: string;
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount_paise: number;
  platform_fee_paise: number;
  status: string;
  created_at: string;
  artist_name?: string;
  client_name?: string;
}

interface PaymentStats {
  total_count: number;
  total_amount_paise: number;
  total_platform_fee_paise: number;
  captured_amount_paise: number;
  refunded_amount_paise: number;
}

function formatINR(paise: number | null): string {
  if (!paise) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-nocturne-info/15 text-nocturne-info',
  quoted: 'bg-nocturne-primary-light/20 text-nocturne-accent',
  negotiating: 'bg-nocturne-primary-light/20 text-nocturne-accent',
  confirmed: 'bg-nocturne-info/15 text-nocturne-info',
  pre_event: 'bg-nocturne-success/15 text-nocturne-success',
  event_day: 'bg-nocturne-warning/15 text-nocturne-warning',
  completed: 'bg-nocturne-success/15 text-nocturne-success',
  settled: 'bg-nocturne-success/15 text-nocturne-success',
  cancelled: 'bg-nocturne-error/15 text-nocturne-error',
  expired: 'bg-nocturne-surface/50 text-nocturne-text-secondary',
  disputed: 'bg-nocturne-warning/15 text-nocturne-warning',
  captured: 'bg-nocturne-success/15 text-nocturne-success',
  created: 'bg-nocturne-info/15 text-nocturne-info',
  refunded: 'bg-nocturne-warning/15 text-nocturne-warning',
  failed: 'bg-nocturne-error/15 text-nocturne-error',
};

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [venueIssues, setVenueIssues] = useState<VenueIssueRecord[]>([]);
  const [seasonalCurves, setSeasonalCurves] = useState<SeasonalCurveRecord[]>([]);
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);
  const [resolvingDispute, setResolvingDispute] = useState<string | null>(null);
  const [resolveForm, setResolveForm] = useState<{ resolution: string; admin_notes: string }>({ resolution: 'upheld', admin_notes: '' });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    if (tab === 'overview') {
      apiClient<PlatformStats>('/v1/admin/stats')
        .then((res) => { if (res.success) setStats(res.data); })
        .finally(() => setLoading(false));
    } else if (tab === 'bookings') {
      apiClient<BookingRecord[]>('/v1/bookings')
        .then((res) => { if (res.success) setBookings(res.data); })
        .finally(() => setLoading(false));
    } else if (tab === 'users') {
      const roleParam = roleFilter !== 'all' ? `&role=${roleFilter}` : '';
      apiClient<UserRecord[]>(`/v1/admin/users?per_page=100${roleParam}`)
        .then((res) => { if (res.success) setUsers(res.data); })
        .finally(() => setLoading(false));
    } else if (tab === 'payments') {
      apiClient<{ payments: PaymentRecord[]; stats: PaymentStats }>('/v1/admin/payments?per_page=100')
        .then((res) => {
          if (res.success) {
            setPayments(res.data.payments);
            setPaymentStats(res.data.stats);
          }
        })
        .finally(() => setLoading(false));
    } else if (tab === 'disputes') {
      apiClient<{ disputes: DisputeRecord[]; total: number }>('/v1/admin/reputation/disputes?per_page=100')
        .then((res) => { if (res.success) setDisputes(res.data.disputes); })
        .finally(() => setLoading(false));
    } else if (tab === 'venues') {
      apiClient<VenueRecord[]>('/v1/venues')
        .then((res) => { if (res.success) setVenues(res.data); })
        .finally(() => setLoading(false));
    } else if (tab === 'intelligence') {
      apiClient<SeasonalCurveRecord[]>('/v1/seasonal/curves')
        .then((res) => { if (res.success) setSeasonalCurves(res.data); })
        .finally(() => setLoading(false));
    }
  }, [tab, roleFilter]);

  const handleVerify = async (artistProfileId: string, verify: boolean) => {
    setActionLoading(artistProfileId);
    await apiClient(`/v1/admin/artists/${artistProfileId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ is_verified: verify }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === artistProfileId ? { ...u, is_verified: verify } : u)),
    );
    setActionLoading(null);
  };

  const handleSuspend = async (userId: string, active: boolean) => {
    setActionLoading(userId);
    await apiClient(`/v1/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ is_active: active }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: active } : u)),
    );
    setActionLoading(null);
  };

  const filteredBookings = useMemo(
    () => statusFilter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === statusFilter),
    [bookings, statusFilter]
  );
  const statuses = ['all', ...new Set(bookings.map((b) => b.status))];

  if (user && user.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-nocturne-text-primary mb-2">Admin Access Required</h1>
        <p className="text-nocturne-text-secondary">You are logged in as <span className="font-medium">{user.role}</span>. This dashboard is only available to administrators.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      <section className="relative">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <Shield size={32} className="text-[#c39bff]" />
          <div>
            <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Admin Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Platform oversight and management tools</p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="glass-card border-nocturne-border rounded-xl p-1 w-fit">
        {(['overview', 'bookings', 'users', 'payments', 'disputes', 'venues', 'intelligence'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm rounded-lg capitalize font-medium transition-all ${
              tab === t
                ? 'bg-nocturne-primary-light text-nocturne-accent shadow-nocturne-glow-sm'
                : 'text-nocturne-text-secondary hover:text-nocturne-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nocturne-accent" />
        </div>
      )}

      {/* Overview Tab */}
      {!loading && tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users.total, sub: `+${stats.users.new_this_week} this week`, icon: Users, color: 'from-blue-500/20 to-cyan-500/20' },
              { label: 'Artists', value: stats.users.artists, sub: `${stats.verified_artists} verified`, icon: Users, color: 'from-purple-500/20 to-pink-500/20' },
              { label: 'Clients', value: stats.users.clients, icon: Users, color: 'from-teal-500/20 to-cyan-500/20' },
              { label: 'Total Bookings', value: stats.bookings.total, icon: Calendar, color: 'from-orange-500/20 to-amber-500/20' },
              { label: 'Confirmed', value: stats.bookings.confirmed, color: 'from-cyan-500/20 to-blue-500/20', icon: Calendar, valueColor: 'text-cyan-300' },
              { label: 'Completed', value: stats.bookings.completed, color: 'from-emerald-500/20 to-teal-500/20', icon: Calendar, valueColor: 'text-emerald-300' },
              { label: 'Cancelled', value: stats.bookings.cancelled, color: 'from-rose-500/20 to-red-500/20', icon: Calendar, valueColor: 'text-rose-300' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`glass-card border-nocturne-border rounded-xl p-5 bg-gradient-to-br ${s.color} group hover-glow transition-all`}>
                  <div className="flex items-start justify-between mb-3">
                    <Icon size={20} className="text-nocturne-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs text-nocturne-text-secondary uppercase font-semibold tracking-wide">{s.label}</p>
                  <p className={`text-3xl font-bold mt-2 ${s.valueColor ?? 'text-nocturne-text-primary'}`}>{s.value}</p>
                  {s.sub && <p className="text-xs text-nocturne-text-secondary mt-2">{s.sub}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {!loading && tab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-nocturne-primary-light text-nocturne-accent shadow-nocturne-glow-sm'
                    : 'glass-card border-nocturne-border text-nocturne-text-secondary hover:text-nocturne-text-primary'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
                {s !== 'all' && ` (${bookings.filter((b) => b.status === s).length})`}
              </button>
            ))}
          </div>

          <div className="glass-card border-nocturne-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface border-b border-nocturne-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Booking ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Artist</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Event</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredBookings.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-nocturne-text-secondary">No bookings found</td></tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-nocturne-surface/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-nocturne-text-secondary">{b.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-nocturne-text-primary font-medium">{b.artist_stage_name ?? '-'}</td>
                        <td className="px-4 py-3 text-nocturne-text-secondary">{b.event_type} · {b.event_city}</td>
                        <td className="px-4 py-3 text-nocturne-text-secondary">{new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-3 text-nocturne-text-primary font-semibold">{b.final_amount_paise ? `₹${formatINR(b.final_amount_paise)}` : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-white/10 text-white/40 border border-white/10'}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {!loading && tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'artist', 'client', 'agent', 'event_company'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                  roleFilter === r
                    ? 'bg-nocturne-primary-light text-nocturne-accent shadow-nocturne-glow-sm'
                    : 'glass-card border-nocturne-border text-nocturne-text-secondary hover:text-nocturne-text-primary'
                }`}
              >
                {r === 'all' ? 'All Roles' : r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="glass-card border-nocturne-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface border-b border-nocturne-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">City</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Trust / Bookings</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Joined</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-nocturne-text-secondary">No users found</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-nocturne-surface/5 transition-colors">
                        <td className="px-4 py-3 text-nocturne-text-primary font-medium">
                          {u.stage_name || u.company_name || u.id.slice(0, 8)}
                          {u.is_verified && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">Verified</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-nocturne-primary-light text-nocturne-accent border border-nocturne-border-subtle font-medium capitalize">
                            {u.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-nocturne-text-secondary">{u.base_city ?? '-'}</td>
                        <td className="px-4 py-3 text-nocturne-text-secondary font-medium">
                          {u.role === 'artist' ? `${u.trust_score ?? 0}% / ${u.total_bookings ?? 0}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${u.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-nocturne-text-secondary">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {u.role === 'artist' && (
                              <button
                                onClick={() => handleVerify(u.id, !u.is_verified)}
                                disabled={actionLoading === u.id}
                                className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                                  u.is_verified
                                    ? 'border-orange-400/30 text-orange-300 hover:bg-orange-500/10'
                                    : 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10'
                                } disabled:opacity-50`}
                              >
                                {u.is_verified ? 'Unverify' : 'Verify'}
                              </button>
                            )}
                            <button
                              onClick={() => handleSuspend(u.id, !u.is_active)}
                              disabled={actionLoading === u.id}
                              className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                                u.is_active
                                  ? 'border-rose-400/30 text-rose-300 hover:bg-rose-500/10'
                                  : 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10'
                              } disabled:opacity-50`}
                            >
                              {u.is_active ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {!loading && tab === 'payments' && (
        <div className="space-y-4">
          {paymentStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card border-nocturne-border rounded-xl p-5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <CreditCard size={20} className="text-nocturne-accent" />
                  </div>
                  <p className="text-xs text-nocturne-text-secondary uppercase font-semibold tracking-wide">Total Payments</p>
                  <p className="text-3xl font-bold text-nocturne-text-primary mt-2">{paymentStats.total_count}</p>
                </div>
                <div className="glass-card border-nocturne-border rounded-xl p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <BarChart3 size={20} className="text-nocturne-accent" />
                  </div>
                  <p className="text-xs text-nocturne-text-secondary uppercase font-semibold tracking-wide">Total Volume</p>
                  <p className="text-3xl font-bold text-nocturne-text-primary mt-2">₹{formatINR(paymentStats.total_amount_paise)}</p>
                </div>
                <div className="glass-card border-nocturne-border rounded-xl p-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <CreditCard size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-xs text-nocturne-text-secondary uppercase font-semibold tracking-wide">Platform Revenue</p>
                  <p className="text-3xl font-bold text-emerald-300 mt-2">₹{formatINR(paymentStats.total_platform_fee_paise)}</p>
                </div>
                <div className="glass-card border-nocturne-border rounded-xl p-5 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <BarChart3 size={20} className="text-amber-400" />
                  </div>
                  <p className="text-xs text-nocturne-text-secondary uppercase font-semibold tracking-wide">Refunded</p>
                  <p className="text-3xl font-bold text-amber-300 mt-2">₹{formatINR(paymentStats.refunded_amount_paise)}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setActionLoading('settle');
                  const res = await apiClient<{ settled_count: number }>('/v1/payments/settle-eligible', { method: 'POST' });
                  setActionLoading(null);
                  if (res.success) alert(`Settled ${res.data.settled_count} payment(s)`);
                }}
                disabled={actionLoading === 'settle'}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white rounded-lg text-sm font-medium hover-glow disabled:opacity-50 transition-all"
              >
                {actionLoading === 'settle' ? 'Settling...' : 'Auto-Settle Eligible Payments'}
              </button>
            </div>
          )}

          <div className="glass-card border-nocturne-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface border-b border-nocturne-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Payment ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Artist</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Client</th>
                    <th className="text-right px-4 py-3 font-semibold text-nocturne-text-primary">Amount</th>
                    <th className="text-right px-4 py-3 font-semibold text-nocturne-text-primary">Platform Fee</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {payments.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-nocturne-text-secondary">No payments yet</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-nocturne-surface/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-nocturne-text-secondary">{p.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-nocturne-text-primary font-medium">{p.artist_name ?? '-'}</td>
                        <td className="px-4 py-3 text-nocturne-text-secondary">{p.client_name ?? '-'}</td>
                        <td className="px-4 py-3 text-right text-nocturne-text-primary font-semibold">₹{formatINR(p.amount_paise)}</td>
                        <td className="px-4 py-3 text-right text-emerald-300 font-semibold">₹{formatINR(p.platform_fee_paise)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] ?? 'bg-white/10 text-white/40 border border-white/10'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-nocturne-text-secondary">
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {!loading && tab === 'disputes' && (
        <div className="space-y-4">
          <div className="glass-card border-nocturne-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface border-b border-nocturne-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Reason</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Created</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {disputes.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-nocturne-text-secondary">No disputes found</td></tr>
                  ) : (
                    disputes.map((d) => (
                      <tr key={d.id} className="hover:bg-nocturne-surface/5 transition-colors">
                        <td className="px-4 py-3 text-nocturne-text-primary">
                          {d.reason.length > 100 ? `${d.reason.slice(0, 100)}...` : d.reason}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            d.status === 'submitted' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                            d.status === 'under_review' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' :
                            d.status === 'upheld' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                            d.status === 'overturned' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                            d.status === 'dismissed' ? 'bg-white/10 text-white/40 border border-white/10' :
                            'bg-white/10 text-white/40 border border-white/10'
                          }`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-nocturne-text-secondary">
                          {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          {resolvingDispute === d.id ? (
                            <div className="space-y-2 bg-nocturne-base p-3 rounded-lg border border-nocturne-border">
                              <select
                                value={resolveForm.resolution}
                                onChange={(e) => setResolveForm((f) => ({ ...f, resolution: e.target.value }))}
                                className="block w-full text-xs bg-nocturne-surface border border-nocturne-border rounded px-2 py-1.5 text-nocturne-text-primary"
                              >
                                <option value="upheld">Upheld</option>
                                <option value="overturned">Overturned</option>
                                <option value="dismissed">Dismissed</option>
                              </select>
                              <textarea
                                value={resolveForm.admin_notes}
                                onChange={(e) => setResolveForm((f) => ({ ...f, admin_notes: e.target.value }))}
                                placeholder="Admin notes..."
                                className="block w-full text-xs bg-nocturne-surface border border-nocturne-border rounded px-2 py-1.5 h-16 resize-none text-nocturne-text-primary placeholder-nocturne-text-secondary"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    setActionLoading(d.id);
                                    await apiClient(`/v1/admin/reputation/disputes/${d.id}/resolve`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ resolution: resolveForm.resolution, admin_notes: resolveForm.admin_notes }),
                                    });
                                    setActionLoading(null);
                                    setResolvingDispute(null);
                                    setResolveForm({ resolution: 'upheld', admin_notes: '' });
                                    const res = await apiClient<{ disputes: DisputeRecord[]; total: number }>('/v1/admin/reputation/disputes?per_page=100');
                                    if (res.success) setDisputes(res.data.disputes);
                                  }}
                                  disabled={actionLoading === d.id}
                                  className="text-xs px-2 py-1 rounded-lg border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 font-medium"
                                >
                                  {actionLoading === d.id ? 'Saving...' : 'Submit'}
                                </button>
                                <button
                                  onClick={() => { setResolvingDispute(null); setResolveForm({ resolution: 'upheld', admin_notes: '' }); }}
                                  className="text-xs px-2 py-1 rounded-lg border border-nocturne-border text-nocturne-text-secondary hover:bg-nocturne-surface/10 font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResolvingDispute(d.id)}
                              disabled={d.status === 'upheld' || d.status === 'overturned' || d.status === 'dismissed'}
                              className="text-xs px-2 py-1 rounded-lg border border-nocturne-border-subtle text-nocturne-accent hover:bg-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Venues Tab */}
      {!loading && tab === 'venues' && (
        <div className="space-y-4">
          <div className="glass-card border-nocturne-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface border-b border-nocturne-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">City</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Capacity</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {venues.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-nocturne-text-secondary">No venues found</td></tr>
                  ) : (
                    venues.map((v) => (
                      <Fragment key={v.id}>
                        <tr className="hover:bg-nocturne-surface/5 transition-colors">
                          <td className="px-4 py-3 text-nocturne-text-primary font-medium">{v.name}</td>
                          <td className="px-4 py-3 text-nocturne-text-secondary">{v.city}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-nocturne-primary-light text-nocturne-accent border border-nocturne-border-subtle font-medium">
                              {v.venue_type?.replace('_', ' ') ?? '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-nocturne-text-secondary">{v.capacity?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                if (expandedVenue === v.id) {
                                  setExpandedVenue(null);
                                  return;
                                }
                                setActionLoading(v.id);
                                const res = await apiClient<VenueIssueRecord[]>(`/v1/reputation/venues/${v.id}/issues`);
                                if (res.success) setVenueIssues(res.data);
                                setExpandedVenue(v.id);
                                setActionLoading(null);
                              }}
                              disabled={actionLoading === v.id}
                              className="text-xs px-2 py-1 rounded-lg border border-nocturne-border-subtle text-nocturne-accent hover:bg-primary-500/10 disabled:opacity-50 font-medium"
                            >
                              {actionLoading === v.id ? 'Loading...' : expandedVenue === v.id ? 'Hide Issues' : 'View Issues'}
                            </button>
                          </td>
                        </tr>
                        {expandedVenue === v.id && (
                          <tr key={`${v.id}-issues`}>
                            <td colSpan={5} className="px-4 py-3 bg-nocturne-surface/5">
                              {venueIssues.length === 0 ? (
                                <p className="text-sm text-nocturne-text-secondary">No issues reported for this venue.</p>
                              ) : (
                                <div className="space-y-2">
                                  {venueIssues.map((issue) => (
                                    <div key={issue.id} className="flex items-start justify-between glass-card border-nocturne-border rounded-lg p-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs px-2 py-1 rounded-full bg-nocturne-primary-light text-nocturne-accent border border-nocturne-border-subtle font-medium">
                                            {issue.issue_type.replace('_', ' ')}
                                          </span>
                                          {issue.is_verified && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-medium">Verified</span>
                                          )}
                                        </div>
                                        <p className="text-sm text-nocturne-text-primary">{issue.description ?? 'No description'}</p>
                                        <p className="text-xs text-nocturne-text-secondary">
                                          {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </p>
                                      </div>
                                      {!issue.is_verified && (
                                        <button
                                          onClick={async () => {
                                            setActionLoading(issue.id);
                                            await apiClient(`/v1/admin/reputation/venue-issues/${issue.id}/verify`, {
                                              method: 'PUT',
                                              body: JSON.stringify({ is_verified: true }),
                                            });
                                            setActionLoading(null);
                                            const res = await apiClient<VenueIssueRecord[]>(`/v1/reputation/venues/${v.id}/issues`);
                                            if (res.success) setVenueIssues(res.data);
                                          }}
                                          disabled={actionLoading === issue.id}
                                          className="text-xs px-2 py-1 rounded-lg border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 shrink-0 font-medium"
                                        >
                                          {actionLoading === issue.id ? 'Verifying...' : 'Verify'}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Intelligence Tab */}
      {!loading && tab === 'intelligence' && (
        <div className="space-y-6">
          <h2 className="text-xl font-display text-nocturne-text-primary flex items-center gap-2">
            <BarChart3 size={24} className="text-nocturne-accent" />
            Seasonal Demand Overview
          </h2>
          <div className="glass-card border-nocturne-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface border-b border-nocturne-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">City</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Month</th>
                    <th className="text-left px-4 py-3 font-semibold text-nocturne-text-primary">Classification</th>
                    <th className="text-right px-4 py-3 font-semibold text-nocturne-text-primary">Fill Rate %</th>
                    <th className="text-right px-4 py-3 font-semibold text-nocturne-text-primary">YoY Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {seasonalCurves.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-nocturne-text-secondary">No seasonal data available</td></tr>
                  ) : (
                    seasonalCurves.map((c, i) => (
                      <tr key={`${c.city}-${c.month}-${i}`} className="hover:bg-nocturne-surface/5 transition-colors">
                        <td className="px-4 py-3 text-nocturne-text-primary font-medium">{c.city}</td>
                        <td className="px-4 py-3 text-nocturne-text-secondary">
                          {new Date(2024, c.month - 1).toLocaleString('en-IN', { month: 'long' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            c.demand_classification === 'peak' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                            c.demand_classification === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' :
                            c.demand_classification === 'moderate' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                            c.demand_classification === 'low' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                            'bg-white/10 text-white/40 border border-white/10'
                          }`}>
                            {c.demand_classification}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-nocturne-text-primary font-semibold">
                          {(c.avg_fill_rate * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {c.yoy_trend_pct !== null ? (
                            <span className={c.yoy_trend_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                              {c.yoy_trend_pct >= 0 ? '↑' : '↓'} {Math.abs(c.yoy_trend_pct).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-nocturne-text-secondary">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card border-nocturne-border rounded-xl p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <h3 className="text-sm font-display text-nocturne-text-primary">Substitution Requests</h3>
              <p className="text-xs text-nocturne-text-secondary mt-3">Coming soon</p>
            </div>
            <div className="glass-card border-nocturne-border rounded-xl p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
              <h3 className="text-sm font-display text-nocturne-text-primary">Recommendation Stats</h3>
              <p className="text-xs text-nocturne-text-secondary mt-3">Coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
