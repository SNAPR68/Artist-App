'use client';

import { useEffect, useState } from 'react';
import { Mail, Wallet, CheckCircle, CreditCard, XCircle, Bell, Building2, Star } from 'lucide-react';
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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  booking_inquiry: <Mail className="w-5 h-5" />,
  quote_received: <Wallet className="w-5 h-5" />,
  booking_confirmed: <CheckCircle className="w-5 h-5" />,
  payment_received: <CreditCard className="w-5 h-5" />,
  booking_cancelled: <XCircle className="w-5 h-5" />,
  event_reminder: <Bell className="w-5 h-5" />,
  settlement_complete: <Building2 className="w-5 h-5" />,
  review_published: <Star className="w-5 h-5" />,
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient-nocturne mb-1">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-nocturne-text-secondary">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex gap-2 bg-nocturne-surface-2/50 rounded-full p-1 border border-nocturne-border backdrop-blur-3xl">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm rounded-lg capitalize font-medium transition-all duration-200 ${
                  filter === f ? 'bg-gradient-nocturne text-white shadow-nocturne-glow-sm' : 'text-nocturne-text-secondary hover:text-nocturne-text-primary'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 text-sm font-medium text-nocturne-accent hover:text-nocturne-accent bg-nocturne-primary-light border border-nocturne-border rounded-full transition-all hover:bg-nocturne-primary-light"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-nocturne-primary/20 border-t-nocturne-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card border border-nocturne-border p-12 text-center space-y-3">
          <Bell className="w-12 h-12 text-nocturne-text-secondary mx-auto opacity-50" />
          <p className="text-nocturne-text-primary text-lg font-semibold">No notifications</p>
          <p className="text-sm text-nocturne-text-secondary">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass-card border border-nocturne-border px-6 py-4 flex items-start gap-4 transition-all duration-300 hover:border-nocturne-border-strong hover:shadow-nocturne-glow-sm ${
                n.read_at ? 'opacity-75' : 'opacity-100'
              }`}
            >
              <div className={`flex-shrink-0 p-2.5 rounded-lg ${n.read_at ? 'bg-slate-500/20 text-slate-300' : 'bg-gradient-nocturne/20 text-nocturne-accent'}`}>
                {TYPE_ICONS[n.type] ?? <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${n.read_at ? 'text-nocturne-text-secondary' : 'text-nocturne-text-primary'}`}>
                  {n.title}
                </p>
                {n.body && <p className="text-sm text-nocturne-text-secondary mt-1 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-nocturne-text-secondary mt-2">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!n.read_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-nocturne animate-pulse" />
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-nocturne-accent hover:text-nocturne-accent whitespace-nowrap font-medium transition-colors"
                    >
                      Mark read
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
