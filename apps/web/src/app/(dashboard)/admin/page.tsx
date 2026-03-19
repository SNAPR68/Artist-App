'use client';

import { Fragment, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

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
  inquiry: 'bg-blue-100 text-blue-700',
  quoted: 'bg-indigo-100 text-indigo-700',
  negotiating: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-cyan-100 text-cyan-700',
  pre_event: 'bg-teal-100 text-teal-700',
  event_day: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  settled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  disputed: 'bg-orange-100 text-orange-700',
  captured: 'bg-green-100 text-green-700',
  created: 'bg-blue-100 text-blue-700',
  refunded: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
};

export default function AdminDashboardPage() {
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

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);
  const statuses = ['all', ...new Set(bookings.map((b) => b.status))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['overview', 'bookings', 'users', 'payments', 'disputes', 'venues', 'intelligence'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md capitalize transition-colors ${
              tab === t
                ? 'bg-white text-primary-600 font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      )}

      {/* Overview Tab */}
      {!loading && tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users.total, sub: `+${stats.users.new_this_week} this week` },
              { label: 'Artists', value: stats.users.artists, sub: `${stats.verified_artists} verified` },
              { label: 'Clients', value: stats.users.clients },
              { label: 'Total Bookings', value: stats.bookings.total },
              { label: 'Confirmed', value: stats.bookings.confirmed, color: 'text-cyan-600' },
              { label: 'Completed', value: stats.bookings.completed, color: 'text-green-600' },
              { label: 'Cancelled', value: stats.bookings.cancelled, color: 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color ?? 'text-gray-900'}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
              </div>
            ))}
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
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
                {s !== 'all' && ` (${bookings.filter((b) => b.status === s).length})`}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Booking ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Artist</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-gray-900">{b.artist_stage_name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{b.event_type} &middot; {b.event_city}</td>
                        <td className="px-4 py-3 text-gray-700">{new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-3 text-gray-900">{b.final_amount_paise ? `₹${formatINR(b.final_amount_paise)}` : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
          <div className="flex gap-2">
            {['all', 'artist', 'client', 'agent', 'event_company'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  roleFilter === r
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {r === 'all' ? 'All Roles' : r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Trust / Bookings</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          {u.stage_name || u.company_name || u.id.slice(0, 8)}
                          {u.is_verified && <span className="ml-1 text-primary-500 text-xs">Verified</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                            {u.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{u.base_city ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {u.role === 'artist' ? `${u.trust_score ?? 0} / ${u.total_bookings ?? 0}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {u.role === 'artist' && (
                              <button
                                onClick={() => handleVerify(u.id, !u.is_verified)}
                                disabled={actionLoading === u.id}
                                className={`text-xs px-2 py-1 rounded border ${
                                  u.is_verified
                                    ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                                    : 'border-green-300 text-green-600 hover:bg-green-50'
                                } disabled:opacity-50`}
                              >
                                {u.is_verified ? 'Unverify' : 'Verify'}
                              </button>
                            )}
                            <button
                              onClick={() => handleSuspend(u.id, !u.is_active)}
                              disabled={actionLoading === u.id}
                              className={`text-xs px-2 py-1 rounded border ${
                                u.is_active
                                  ? 'border-red-300 text-red-600 hover:bg-red-50'
                                  : 'border-green-300 text-green-600 hover:bg-green-50'
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
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{paymentStats.total_count}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Volume</p>
                  <p className="text-2xl font-bold text-gray-900">₹{formatINR(paymentStats.total_amount_paise)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Platform Revenue</p>
                  <p className="text-2xl font-bold text-green-600">₹{formatINR(paymentStats.total_platform_fee_paise)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Refunded</p>
                  <p className="text-2xl font-bold text-orange-600">₹{formatINR(paymentStats.refunded_amount_paise)}</p>
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === 'settle' ? 'Settling...' : 'Auto-Settle Eligible Payments'}
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Payment ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Artist</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Platform Fee</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payments yet</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-gray-900">{p.artist_name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{p.client_name ?? '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">₹{formatINR(p.amount_paise)}</td>
                        <td className="px-4 py-3 text-right text-green-600">₹{formatINR(p.platform_fee_paise)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {disputes.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No disputes found</td></tr>
                  ) : (
                    disputes.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">
                          {d.reason.length > 100 ? `${d.reason.slice(0, 100)}...` : d.reason}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            d.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                            d.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                            d.status === 'upheld' ? 'bg-green-100 text-green-700' :
                            d.status === 'overturned' ? 'bg-red-100 text-red-700' :
                            d.status === 'dismissed' ? 'bg-gray-100 text-gray-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          {resolvingDispute === d.id ? (
                            <div className="space-y-2">
                              <select
                                value={resolveForm.resolution}
                                onChange={(e) => setResolveForm((f) => ({ ...f, resolution: e.target.value }))}
                                className="block w-full text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="upheld">Upheld</option>
                                <option value="overturned">Overturned</option>
                                <option value="dismissed">Dismissed</option>
                              </select>
                              <textarea
                                value={resolveForm.admin_notes}
                                onChange={(e) => setResolveForm((f) => ({ ...f, admin_notes: e.target.value }))}
                                placeholder="Admin notes..."
                                className="block w-full text-xs border border-gray-300 rounded px-2 py-1 h-16 resize-none"
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
                                  className="text-xs px-2 py-1 rounded border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50"
                                >
                                  {actionLoading === d.id ? 'Saving...' : 'Submit'}
                                </button>
                                <button
                                  onClick={() => { setResolvingDispute(null); setResolveForm({ resolution: 'upheld', admin_notes: '' }); }}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResolvingDispute(d.id)}
                              disabled={d.status === 'upheld' || d.status === 'overturned' || d.status === 'dismissed'}
                              className="text-xs px-2 py-1 rounded border border-primary-300 text-primary-600 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Capacity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {venues.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No venues found</td></tr>
                  ) : (
                    venues.map((v) => (
                      <Fragment key={v.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{v.name}</td>
                          <td className="px-4 py-3 text-gray-700">{v.city}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {v.venue_type?.replace('_', ' ') ?? '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{v.capacity?.toLocaleString() ?? '-'}</td>
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
                              className="text-xs px-2 py-1 rounded border border-primary-300 text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                            >
                              {actionLoading === v.id ? 'Loading...' : expandedVenue === v.id ? 'Hide Issues' : 'View Issues'}
                            </button>
                          </td>
                        </tr>
                        {expandedVenue === v.id && (
                          <tr key={`${v.id}-issues`}>
                            <td colSpan={5} className="px-4 py-3 bg-gray-50">
                              {venueIssues.length === 0 ? (
                                <p className="text-sm text-gray-500">No issues reported for this venue.</p>
                              ) : (
                                <div className="space-y-2">
                                  {venueIssues.map((issue) => (
                                    <div key={issue.id} className="flex items-start justify-between bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                            {issue.issue_type.replace('_', ' ')}
                                          </span>
                                          {issue.is_verified && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Verified</span>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-700">{issue.description ?? 'No description'}</p>
                                        <p className="text-xs text-gray-400">
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
                                          className="text-xs px-2 py-1 rounded border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50 shrink-0"
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
          <h2 className="text-lg font-semibold text-gray-900">Seasonal Demand Overview</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Classification</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Fill Rate %</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">YoY Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {seasonalCurves.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No seasonal data available</td></tr>
                  ) : (
                    seasonalCurves.map((c, i) => (
                      <tr key={`${c.city}-${c.month}-${i}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{c.city}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(2024, c.month - 1).toLocaleString('en-IN', { month: 'long' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            c.demand_classification === 'peak' ? 'bg-red-100 text-red-700' :
                            c.demand_classification === 'high' ? 'bg-orange-100 text-orange-700' :
                            c.demand_classification === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            c.demand_classification === 'low' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {c.demand_classification}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {(c.avg_fill_rate * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {c.yoy_trend_pct !== null ? (
                            <span className={c.yoy_trend_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {c.yoy_trend_pct >= 0 ? '+' : ''}{c.yoy_trend_pct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
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
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900">Substitution Requests</h3>
              <p className="text-xs text-gray-400 mt-2">Coming soon</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-900">Recommendation Stats</h3>
              <p className="text-xs text-gray-400 mt-2">Coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
