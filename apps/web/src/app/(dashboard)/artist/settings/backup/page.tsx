'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface BackupPreferences {
  is_reliable_backup: boolean;
  backup_premium_pct: number;
}

export default function BackupPreferencesPage() {
  const [prefs, setPrefs] = useState<BackupPreferences>({ is_reliable_backup: false, backup_premium_pct: 25 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<BackupPreferences>('/v1/artists/me/backup-preferences')
      .then((res) => {
        if (res.success) setPrefs(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await apiClient<BackupPreferences>('/v1/artists/me/backup-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          is_reliable_backup: prefs.is_reliable_backup,
          backup_premium_pct: prefs.backup_premium_pct,
        }),
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError((res as { error?: string }).error ?? 'Failed to save preferences');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

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
        <h1 className="text-2xl font-bold text-nocturne-text-primary">Backup Artist Preferences</h1>
        <p className="text-sm text-nocturne-text-tertiary mt-1">
          Opt in to receive last-minute booking opportunities when another artist cancels.
        </p>
      </div>

      <div className="glass-card rounded-xl border border-white/5 p-6 space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-nocturne-text-primary text-sm">Available as backup artist</p>
            <p className="text-xs text-nocturne-text-tertiary mt-0.5">
              You&apos;ll be notified when short-notice gigs match your profile.
            </p>
          </div>
          <button
            onClick={() => setPrefs((p) => ({ ...p, is_reliable_backup: !p.is_reliable_backup }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.is_reliable_backup ? 'bg-nocturne-accent' : 'bg-nocturne-surface-2'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.is_reliable_backup ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Premium Input */}
        {prefs.is_reliable_backup && (
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">
              Premium for short notice (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={prefs.backup_premium_pct}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  backup_premium_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                }))
              }
              className="w-32 border border-white/5 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-nocturne-accent focus:border-nocturne-accent outline-none bg-nocturne-surface-2 text-nocturne-text-primary"
            />
            <p className="text-xs text-nocturne-text-tertiary mt-1">
              You&apos;ll earn {prefs.backup_premium_pct}% more than the original booking amount for
              accepting short-notice gigs.
            </p>
          </div>
        )}

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-nocturne-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-nocturne-primary transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          {success && (
            <span className="text-sm text-nocturne-success font-medium">Preferences saved!</span>
          )}
          {error && <span className="text-sm text-nocturne-error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
