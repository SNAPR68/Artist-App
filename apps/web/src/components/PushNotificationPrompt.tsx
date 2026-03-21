'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { requestPushPermission, onForegroundMessage } from '@/lib/firebase';
import { useAuthStore } from '@/lib/auth';

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    // Show prompt after 10 seconds on the page
    const timer = setTimeout(() => setShowPrompt(true), 10_000);
    return () => clearTimeout(timer);
  }, [user]);

  // Listen for foreground messages
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onForegroundMessage((payload) => {
      if (payload.notification) {
        new Notification(payload.notification.title ?? 'New notification', {
          body: payload.notification.body,
          icon: '/icons/icon-192x192.png',
        });
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [user]);

  const handleEnable = async () => {
    setRegistering(true);
    try {
      const fcmToken = await requestPushPermission();
      const accessToken = localStorage.getItem('access_token');
      if (fcmToken && accessToken) {
        // Register device token with API
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/notifications/devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            fcm_token: fcmToken,
            platform: 'web',
          }),
        });
      }
    } catch (error) {
      console.error('Push registration failed:', error);
    } finally {
      setShowPrompt(false);
      setRegistering(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in-up">
      <div className="glass-card p-4 border border-primary-500/30 shadow-glow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-primary-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-text-primary">Enable Notifications</h4>
            <p className="text-xs text-text-muted mt-1">
              Get instant updates on bookings, payments, and messages.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={registering}
                className="px-3 py-1.5 bg-gradient-accent text-white text-xs font-semibold rounded-lg hover-glow disabled:opacity-50"
              >
                {registering ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="px-3 py-1.5 bg-glass-medium border border-glass-border text-text-muted text-xs rounded-lg hover:bg-glass-heavy"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={() => setShowPrompt(false)} className="text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
