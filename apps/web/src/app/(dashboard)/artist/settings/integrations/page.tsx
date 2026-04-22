'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Instagram, X } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface CalendarStatus {
  connected: boolean;
  email?: string;
  last_synced_at?: string;
}

interface IgStatus {
  connected: boolean;
  ig_username?: string;
  follower_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  expires_at?: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);
  const [igStatus, setIgStatus] = useState<IgStatus | null>(null);
  const [calLoading, setCalLoading] = useState(true);
  const [igLoading, setIgLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [igDisconnecting, setIgDisconnecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Handle OAuth callback success
  useEffect(() => {
    const ig = searchParams.get('instagram');
    const username = searchParams.get('username');
    if (ig === 'connected' && username) {
      setToast(`@${username} connected successfully`);
      setTimeout(() => setToast(null), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    apiClient<CalendarStatus>('/v1/calendar/google/status')
      .then((res) => setCalStatus(res.success ? (res.data as unknown as CalendarStatus) : { connected: false }))
      .catch(() => setCalStatus({ connected: false }))
      .finally(() => setCalLoading(false));

    apiClient<IgStatus>('/v1/instagram/status')
      .then((res) => setIgStatus(res.success ? (res.data as unknown as IgStatus) : { connected: false }))
      .catch(() => setIgStatus({ connected: false }))
      .finally(() => setIgLoading(false));
  }, []);

  async function handleCalDisconnect() {
    setDisconnecting(true);
    try {
      await apiClient('/v1/calendar/google/disconnect', { method: 'POST' });
      setCalStatus({ connected: false });
    } catch { /* silent */ } finally {
      setDisconnecting(false);
    }
  }

  async function handleIgConnect() {
    const res = await apiClient<{ auth_url: string }>('/v1/instagram/connect');
    if (res.success && (res.data as unknown as { auth_url: string })?.auth_url) {
      window.location.href = (res.data as unknown as { auth_url: string }).auth_url;
    }
  }

  async function handleIgDisconnect() {
    setIgDisconnecting(true);
    try {
      await apiClient('/v1/instagram/disconnect', { method: 'POST' });
      setIgStatus({ connected: false });
    } catch { /* silent */ } finally {
      setIgDisconnecting(false);
    }
  }

  async function handleIgSync() {
    try {
      await apiClient('/v1/instagram/sync', { method: 'POST' });
      const res = await apiClient<IgStatus>('/v1/instagram/status');
      if (res.success) setIgStatus(res.data as unknown as IgStatus);
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      {/* Ambient glows */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 glass-card rounded-xl px-5 py-3 border border-emerald-500/30 text-emerald-300 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/30 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tighter text-white">
          Integrations
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Connect external services to your GRID account.
        </p>
      </div>

      {/* Instagram card */}
      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden max-w-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#e1306c]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-extrabold tracking-tighter text-white">
              Instagram Business
            </h2>
            <p className="text-white/50 text-sm mt-0.5">
              Auto-pull your reels, live follower count, and 30-day reach for your microsite + EPK.
            </p>

            <div className="mt-3">
              {igLoading ? (
                <div className="nocturne-skeleton h-4 w-48 rounded" />
              ) : igStatus?.connected ? (
                <div className="space-y-1">
                  <p className="text-[#a1faff] text-xs tracking-widest uppercase font-bold">
                    @{igStatus.ig_username}
                  </p>
                  <p className="text-white/30 text-xs">
                    {igStatus.follower_count?.toLocaleString('en-IN') ?? '—'} followers
                    {' · '}
                    {igStatus.media_count ?? '—'} posts
                    {igStatus.expires_at && (
                      <span> · token expires {relativeTime(igStatus.expires_at)}</span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-white/30 text-xs tracking-widest uppercase font-bold">
                  Not connected
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {!igStatus?.connected ? (
                <button
                  className="btn-nocturne-primary text-sm px-5 py-2 rounded-lg"
                  onClick={handleIgConnect}
                >
                  Connect Instagram
                </button>
              ) : (
                <>
                  <button
                    className="btn-nocturne-secondary text-sm px-5 py-2 rounded-lg"
                    onClick={handleIgSync}
                  >
                    Sync now
                  </button>
                  <button
                    className="text-sm px-5 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                    onClick={handleIgDisconnect}
                    disabled={igDisconnecting}
                  >
                    {igDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Calendar card */}
      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden max-w-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-extrabold tracking-tighter text-white">
              Google Calendar
            </h2>
            <p className="text-white/50 text-sm mt-0.5">
              Two-way sync with your bookings — GRID becomes your canonical calendar.
            </p>

            <div className="mt-3">
              {calLoading ? (
                <div className="nocturne-skeleton h-4 w-48 rounded" />
              ) : calStatus?.connected ? (
                <p className="text-[#a1faff] text-xs tracking-widest uppercase font-bold">
                  Connected as {calStatus.email}
                  {calStatus.last_synced_at && (
                    <span className="text-white/30 normal-case tracking-normal font-normal ml-1">
                      · Last synced {relativeTime(calStatus.last_synced_at)}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-white/30 text-xs tracking-widest uppercase font-bold">Not connected</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {!calStatus?.connected ? (
                <button
                  className="btn-nocturne-primary text-sm px-5 py-2 rounded-lg"
                  onClick={async () => {
                    const res = await apiClient<{ auth_url: string }>('/v1/calendar/google/connect');
                    if (res.success && (res.data as unknown as { auth_url: string })?.auth_url) {
                      window.location.href = (res.data as unknown as { auth_url: string }).auth_url;
                    }
                  }}
                >
                  Connect Google Calendar
                </button>
              ) : (
                <button
                  className="btn-nocturne-secondary text-sm px-5 py-2 rounded-lg"
                  onClick={handleCalDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
