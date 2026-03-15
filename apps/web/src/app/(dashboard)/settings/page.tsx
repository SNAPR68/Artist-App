'use client';

import { useEffect, useState } from 'react';
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

const CHANNEL_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', description: 'Receive notifications via WhatsApp messages' },
  { key: 'sms', label: 'SMS', description: 'Receive notifications via text messages' },
  { key: 'push', label: 'Push Notifications', description: 'Receive push notifications on your device' },
  { key: 'email', label: 'Email', description: 'Receive notifications via email' },
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
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        enabled ? 'bg-primary-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your notification preferences</p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Notification Channels */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Notification Channels</h2>
        <p className="text-sm text-gray-500 mb-4">Choose how you want to receive notifications</p>
        <div className="divide-y divide-gray-100">
          {CHANNEL_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
              <Toggle
                enabled={prefs[option.key]}
                onChange={(value) => handleToggle(option.key, value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notification Categories */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Notification Categories</h2>
        <p className="text-sm text-gray-500 mb-4">Choose what you want to be notified about</p>
        <div className="divide-y divide-gray-100">
          {CATEGORY_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500">{option.description}</p>
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
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
