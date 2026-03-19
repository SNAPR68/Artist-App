'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';

interface CommissionBooking {
  workspace_event_booking_id: string;
  workspace_event_id: string;
  event_name: string;
  booking_id: string;
  artist_id: string;
  artist_name: string;
  booking_amount_paise: number;
  commission_pct: number;
  commission_amount_paise: number;
  state: string;
}

interface CommissionSummary {
  default_commission_pct: number;
  total_bookings: number;
  total_booking_value_paise: number;
  total_commission_paise: number;
  bookings: CommissionBooking[];
}

type SortKey = 'commission_amount_paise' | 'booking_amount_paise' | 'commission_pct' | 'artist_name';

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function WorkspaceCommissionPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultPct, setDefaultPct] = useState<string>('0');
  const [saving, setSaving] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editPct, setEditPct] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('commission_amount_paise');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    apiClient<CommissionSummary>(`/v1/workspaces/${workspaceId}/commission`)
      .then((res) => {
        if (res.success) {
          setSummary(res.data);
          setDefaultPct(String(res.data.default_commission_pct));
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSaveDefault = async () => {
    const pct = parseFloat(defaultPct);
    if (isNaN(pct) || pct < 0 || pct > 50) return;

    setSaving(true);
    await apiClient(`/v1/workspaces/${workspaceId}/commission`, {
      method: 'PUT',
      body: JSON.stringify({ default_commission_pct: pct }),
    });
    setSaving(false);
    fetchSummary();
  };

  const handleSaveBookingCommission = async (booking: CommissionBooking) => {
    const pct = parseFloat(editPct);
    if (isNaN(pct) || pct < 0 || pct > 50) return;

    await apiClient(
      `/v1/workspaces/${workspaceId}/events/${booking.workspace_event_id}/bookings/${booking.booking_id}/commission`,
      {
        method: 'PUT',
        body: JSON.stringify({ commission_pct: pct }),
      },
    );
    setEditingBookingId(null);
    fetchSummary();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!summary) {
    return <p className="text-center py-10 text-gray-500">Could not load commission data</p>;
  }

  const effectiveRate =
    summary.total_booking_value_paise > 0
      ? ((summary.total_commission_paise / summary.total_booking_value_paise) * 100).toFixed(2)
      : '0.00';

  const sortedBookings = [...summary.bookings].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'artist_name') {
      cmp = (a.artist_name ?? '').localeCompare(b.artist_name ?? '');
    } else {
      cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    }
    return sortAsc ? cmp : -cmp;
  });

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/client/workspace/${workspaceId}`} className="text-sm text-primary-500 hover:underline">
          &larr; Back to Workspace
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Commission Tracking</h1>
      </div>

      {/* Default Commission Rate */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Default Commission Rate</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={defaultPct}
              onChange={(e) => setDefaultPct(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
          </div>
          <button
            onClick={handleSaveDefault}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Applied to all bookings unless overridden per-booking. Max 50%.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Booking Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(summary.total_booking_value_paise)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.total_bookings} booking{summary.total_bookings !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Commission Earned</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatINR(summary.total_commission_paise)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Effective Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{effectiveRate}%</p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Bookings</h2>
        </div>

        {sortedBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No bookings linked to workspace events yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th
                    className="px-5 py-3 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('artist_name')}
                  >
                    Artist{sortIndicator('artist_name')}
                  </th>
                  <th className="px-5 py-3">Event</th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('booking_amount_paise')}
                  >
                    Booking Amount{sortIndicator('booking_amount_paise')}
                  </th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('commission_pct')}
                  >
                    Commission %{sortIndicator('commission_pct')}
                  </th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('commission_amount_paise')}
                  >
                    Commission{sortIndicator('commission_amount_paise')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedBookings.map((b) => (
                  <tr key={b.workspace_event_booking_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{b.artist_name ?? 'Unknown'}</td>
                    <td className="px-5 py-3 text-gray-600">{b.event_name}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatINR(b.booking_amount_paise)}</td>
                    <td className="px-5 py-3 text-right">
                      {editingBookingId === b.workspace_event_booking_id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={0.5}
                            value={editPct}
                            onChange={(e) => setEditPct(e.target.value)}
                            onBlur={() => handleSaveBookingCommission(b)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBookingCommission(b);
                              if (e.key === 'Escape') setEditingBookingId(null);
                            }}
                            autoFocus
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-gray-400 text-xs">%</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBookingId(b.workspace_event_booking_id);
                            setEditPct(String(b.commission_pct));
                          }}
                          className="text-gray-700 hover:text-primary-600 hover:underline cursor-pointer"
                          title="Click to edit"
                        >
                          {b.commission_pct}%
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">{formatINR(b.commission_amount_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
