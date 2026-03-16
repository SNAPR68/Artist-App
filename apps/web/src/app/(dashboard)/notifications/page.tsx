'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: string | null;
  read_at: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  booking_inquiry: '📩',
  quote_received: '💰',
  booking_confirmed: '✅',
  payment_received: '💳',
  booking_cancelled: '❌',
  event_reminder: '🔔',
  settlement_complete: '🏦',
  review_published: '⭐',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    setLoading(true);
    const unreadParam = filter === 'unread' ? '&unread=true' : '';
    const res = await apiClient<Notification[]>(`/v1/notifications?per_page=50${unreadParam}`);
    if (res.success) setNotifications(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const handleMarkRead = async (id: string) => {
    await apiClient(`/v1/notifications/${id}/read`, { method: 'PUT' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await apiClient('/v1/notifications/read-all', { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-md capitalize ${
                  filter === f ? 'bg-white text-primary-600 font-medium shadow-sm' : 'text-gray-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg mb-1">No notifications</p>
          <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                n.read_at ? 'bg-white' : 'bg-primary-50'
              }`}
            >
              <span className="text-xl mt-0.5">{TYPE_ICONS[n.type] ?? '📬'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read_at ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                  {n.title}
                </p>
                {n.body && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-primary-500 hover:text-primary-600 whitespace-nowrap mt-1"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
