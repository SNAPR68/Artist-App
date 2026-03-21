'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth';

// ─── Types ──────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  city?: string;
  country?: string;
  bio?: string;
  role?: string;
}

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

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (Devanagari)' },
  { code: 'ja', name: 'Japanese' },
];

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

// ─── Components ─────────────────────────────────────────────

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

function ProfileTab() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    apiClient<UserProfile>('/v1/profile')
      .then((res) => {
        if (res.success) {
          setProfile(res.data);
          setFormData(res.data);
        }
      })
      .catch(() => {
        setFeedback({ type: 'error', message: 'Failed to load profile' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await apiClient<UserProfile>('/v1/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setProfile(res.data);
        setEditing(false);
        setFeedback({ type: 'success', message: 'Profile updated successfully.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to update profile.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'An error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            <button
              onClick={() => {
                setEditing(true);
                setFeedback(null);
              }}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Edit
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Name</p>
              <p className="text-sm font-medium text-gray-900">{profile?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-gray-900">{profile?.email || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Phone</p>
              <p className="text-sm font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">City</p>
              <p className="text-sm font-medium text-gray-900">{profile?.city || 'Not set'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Bio</p>
              <p className="text-sm font-medium text-gray-900">{profile?.bio || 'Not set'}</p>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveProfile();
          }}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PreferencesTab() {
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Notification Channels */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Notification Channels</h3>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Notification Categories</h3>
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

function LanguageTab() {
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'en';
    setLanguage(savedLang);
  }, []);

  const handleSaveLanguage = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      localStorage.setItem('language', language);
      await apiClient('/v1/profile/language', {
        method: 'PUT',
        body: JSON.stringify({ language }),
      });
      setFeedback({ type: 'success', message: 'Language preference saved.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save language preference.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Display Language</h3>
        <p className="text-sm text-gray-500">Choose your preferred language for the platform</p>

        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <label key={lang.code} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="language"
                value={lang.code}
                checked={language === lang.code}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-4 h-4 text-primary-500 focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">{lang.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveLanguage}
            disabled={saving}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Language'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountTab() {
  const router = useRouter();
  const { clearAuthState } = useAuthStore();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error'; message: string } | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE ACCOUNT') {
      setFeedback({ type: 'error', message: 'Please type DELETE ACCOUNT to confirm' });
      return;
    }

    setDeleting(true);
    setFeedback(null);

    try {
      const res = await apiClient('/v1/profile/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: true }),
      });

      if (res.success) {
        clearAuthState?.();
        router.push('/login');
      } else {
        setFeedback({ type: 'error', message: res.errors?.[0]?.message ?? 'Failed to delete account' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'An error occurred while deleting your account.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm font-medium">
          {feedback.message}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security</p>
            </div>
            <button
              disabled
              className="text-sm text-gray-400 px-4 py-2 border border-gray-200 rounded-lg cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>

        {!showDeleteConfirm ? (
          <div>
            <p className="text-sm text-red-800 mb-4">
              Once you delete your account, all your data will be permanently removed. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-800 font-medium">
              This will permanently delete your account and all associated data.
            </p>
            <p className="text-sm text-red-700">
              Type <span className="font-mono font-bold">DELETE ACCOUNT</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE ACCOUNT"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE ACCOUNT'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Account Permanently'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'language' | 'account'>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '🔔' },
    { id: 'language', label: 'Language', icon: '🌐' },
    { id: 'account', label: 'Account', icon: '⚙️' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your profile and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'preferences' && <PreferencesTab />}
          {activeTab === 'language' && <LanguageTab />}
          {activeTab === 'account' && <AccountTab />}
        </div>
      </div>
    </div>
  );
}
