'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Bell, Check } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface NotificationPreferences {
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
  email: boolean;
  booking_updates: boolean;
  payment_updates: boolean;
  reminders: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  whatsapp: true,
  sms: true,
  push: true,
  email: false,
  booking_updates: true,
  payment_updates: true,
  reminders: true,
  marketing: false,
};

// GRID uses WhatsApp + Email only (SMS/voice removed 2026-04-23). Push is
// optional browser-side; it never carries booking data.
const CHANNEL_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', description: 'Booking confirmations, call sheets, and day-of check-ins' },
  { key: 'email', label: 'Email', description: 'Call sheets, BOQs, invoices, and long-form notifications' },
  { key: 'push', label: 'Push Notifications', description: 'Lightweight browser alerts (no booking details)' },
];

const CATEGORY_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'booking_updates', label: 'Booking Updates', description: 'New bookings, status changes, and confirmations' },
  { key: 'payment_updates', label: 'Payment Updates', description: 'Payment received, payout processed, and invoices' },
  { key: 'reminders', label: 'Reminders', description: 'Upcoming events, incomplete actions, and deadlines' },
  { key: 'marketing', label: 'Marketing', description: 'Promotions, tips, and platform updates' },
];

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border border-white/10 transition-all duration-300 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#c39bff] ${
        enabled ? 'bg-[#c39bff] shadow-lg shadow-[#c39bff]/20' : 'bg-white/5'
      }`}
    >
      <span
        className={`pointer-events-none inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white text-white shadow transition duration-300 ease-in-out ${
          enabled ? 'translate-x-7' : 'translate-x-0.5'
        }`}
      >
        {enabled && <Check className="w-4 h-4 text-[#c39bff]" />}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    apiClient<NotificationPreferences>('/v1/notifications/preferences')
      .then((res) => {
        if (res.success) {
          setPrefs({ ...DEFAULT_PREFS, ...res.data });
        }
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await apiClient<NotificationPreferences>('/v1/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Preferences saved successfully.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to save preferences. Please try again.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Ambient glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="space-y-2 relative z-10">
        <h1 className="text-4xl font-display font-bold text-white">Settings</h1>
        <p className="text-white/50">Manage your notification preferences</p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm font-medium border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
              : 'bg-red-500/20 text-red-200 border-red-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Notification Channels Section */}
      <div className="glass-card border border-white/10 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#c39bff]/20 border border-[#c39bff]/30">
            <MessageSquare className="w-5 h-5 text-[#c39bff]" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Notification Channels</h2>
            <p className="text-sm text-white/50 mt-0.5">Choose how you want to receive notifications</p>
          </div>
        </div>
        <div className="nocturne-divider" />
        <div className="space-y-4">
          {CHANNEL_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{option.label}</p>
                <p className="text-xs text-white/50 mt-1">{option.description}</p>
              </div>
              <Toggle
                enabled={prefs[option.key]}
                onChange={(value) => handleToggle(option.key, value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notification Categories Section */}
      <div className="glass-card border border-white/10 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#c39bff]/20 border border-[#c39bff]/30">
            <Bell className="w-5 h-5 text-[#c39bff]" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Notification Categories</h2>
            <p className="text-sm text-white/50 mt-0.5">Choose what you want to be notified about</p>
          </div>
        </div>
        <div className="nocturne-divider" />
        <div className="space-y-4">
          {CATEGORY_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{option.label}</p>
                <p className="text-xs text-white/50 mt-1">{option.description}</p>
              </div>
              <Toggle
                enabled={prefs[option.key]}
                onChange={(value) => handleToggle(option.key, value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-nocturne-primary px-8 py-4 rounded-lg font-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
          <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
        </button>
      </div>
    </div>
  );
}
