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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Backup Artist Preferences</h1>
        <p className="text-white/50 text-sm mt-2">
          Opt in to receive last-minute booking opportunities when another artist cancels.
        </p>
      </div>

      <div className="glass-card rounded-xl border border-white/5 p-8 space-y-6 relative z-10">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">Available as backup artist</p>
            <p className="text-xs text-white/50 mt-1">
              You&apos;ll be notified when short-notice gigs match your profile.
            </p>
          </div>
          <button
            onClick={() => setPrefs((p) => ({ ...p, is_reliable_backup: !p.is_reliable_backup }))}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              prefs.is_reliable_backup ? 'bg-[#c39bff]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                prefs.is_reliable_backup ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Premium Input */}
        {prefs.is_reliable_backup && (
          <div className="border-t border-white/10 pt-6">
            <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-3">
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
              className="w-32 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c39bff] bg-white/5 text-white placeholder-white/30"
            />
            <p className="text-xs text-white/50 mt-2">
              You&apos;ll earn {prefs.backup_premium_pct}% more than the original booking amount for accepting short-notice gigs.
            </p>
          </div>
        )}

        {/* Save */}
        <div className="border-t border-white/10 pt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-lg hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          {success && (
            <span className="text-sm text-green-400 font-bold">Preferences saved!</span>
          )}
          {error && <span className="text-sm text-[#ff8b9a] font-bold">{error}</span>}
        </div>
      </div>
    </div>
  );
}
