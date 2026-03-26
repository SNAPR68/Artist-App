'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface Badge {
  badge_type: string;
  earned_at: string;
}

interface GamificationProfile {
  points: number;
  level: string;
  streak_days: number;
  last_activity_at: string | null;
  badges: Badge[];
  next_level_at: number | null;
}

interface Leaderboard {
  bronze_count: number;
  silver_count: number;
  gold_count: number;
  platinum_count: number;
  total: number;
}

interface PointTransaction {
  id: string;
  action_type: string;
  points: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

const BADGE_INFO: Record<string, { label: string; requirement: string }> = {
  verified_artist: { label: 'Verified Artist', requirement: 'Get verified by the platform' },
  top_performer: { label: 'Top Performer', requirement: 'Maintain 4.5+ trust score' },
  rising_star: { label: 'Rising Star', requirement: 'Under 20 bookings with 3.5+ trust' },
  reliable_backup: { label: 'Reliable Backup', requirement: 'Enable reliable backup in settings' },
  early_bird: { label: 'Early Bird', requirement: 'Average response time under 1 hour' },
  crowd_favorite: { label: 'Crowd Favorite', requirement: 'Consistently high crowd energy ratings' },
};

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-400',
  platinum: 'bg-indigo-500',
};


const ACTION_LABELS: Record<string, string> = {
  profile_complete: 'Profile Completed',
  first_booking: 'First Booking',
  review_left: 'Review Left',
  on_time_performance: 'On-Time Performance',
  five_star_review: 'Five-Star Review',
  gig_application: 'Gig Application',
  streak_7_days: '7-Day Streak Bonus',
};

export default function GamificationPage() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<GamificationProfile>('/v1/gamification/profile'),
      apiClient<Leaderboard>('/v1/gamification/leaderboard'),
      apiClient<{ profile: GamificationProfile; transactions: PointTransaction[] }>('/v1/gamification/transactions'),
    ])
      .then(([profileRes, leaderboardRes, txnRes]) => {
        if (profileRes.success) setProfile(profileRes.data);
        if (leaderboardRes.success) setLeaderboard(leaderboardRes.data);
        if (txnRes.success) setTransactions(txnRes.data.transactions ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const earnedBadgeTypes = new Set(profile?.badges.map((b) => b.badge_type) ?? []);
  const progressPercent = profile && profile.next_level_at
    ? Math.min(100, Math.round((profile.points / profile.next_level_at) * 100))
    : 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-nocturne-text-primary">Gamification</h1>

      {/* Level Progress */}
      <div className="bg-nocturne-surface rounded-lg p-6 border border-nocturne-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-semibold capitalize ${LEVEL_COLORS[profile?.level ?? 'bronze'] ?? 'bg-nocturne-text-tertiary'}`}>
              {profile?.level ?? 'Bronze'}
            </span>
            <span className="ml-3 text-lg font-bold text-nocturne-text-primary">{profile?.points ?? 0} points</span>
          </div>
          {profile?.next_level_at && (
            <span className="text-sm text-nocturne-text-tertiary">
              {profile.points}/{profile.next_level_at} to{' '}
              {(() => {
                const levels = ['bronze', 'silver', 'gold', 'platinum'];
                const idx = levels.indexOf(profile.level);
                return idx < levels.length - 1 ? levels[idx + 1] : '';
              })()}
            </span>
          )}
        </div>
        <div className="w-full bg-nocturne-surface-2 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${LEVEL_COLORS[profile?.level ?? 'bronze'] ?? 'bg-nocturne-text-tertiary'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Streak Counter */}
      <div className="bg-nocturne-surface rounded-lg p-4 border border-nocturne-border-subtle flex items-center gap-3">
        <span className="text-2xl">&#128293;</span>
        <div>
          <p className="text-lg font-bold text-nocturne-text-primary">{profile?.streak_days ?? 0}-day streak</p>
          <p className="text-sm text-nocturne-text-tertiary">Keep your streak alive by staying active daily</p>
        </div>
      </div>

      {/* Badge Gallery */}
      <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-nocturne-border-subtle">
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Badges</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {Object.entries(BADGE_INFO).map(([type, info]) => {
            const earned = earnedBadgeTypes.has(type);
            const badge = profile?.badges.find((b) => b.badge_type === type);
            return (
              <div
                key={type}
                className={`rounded-lg p-4 border text-center ${
                  earned
                    ? 'border-nocturne-primary-light bg-nocturne-primary-light'
                    : 'border-nocturne-border-subtle bg-nocturne-surface-2 opacity-50'
                }`}
              >
                <div className={`text-3xl mb-2 ${earned ? '' : 'grayscale'}`}>
                  {type === 'verified_artist' && '\u2705'}
                  {type === 'top_performer' && '\u2B50'}
                  {type === 'rising_star' && '\uD83C\uDF1F'}
                  {type === 'reliable_backup' && '\uD83D\uDEE1\uFE0F'}
                  {type === 'early_bird' && '\uD83D\uDC26'}
                  {type === 'crowd_favorite' && '\uD83C\uDF89'}
                </div>
                <p className="font-semibold text-nocturne-text-primary text-sm">{info.label}</p>
                {earned && badge ? (
                  <p className="text-xs text-nocturne-success mt-1">
                    Earned {new Date(badge.earned_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-nocturne-text-tertiary mt-1">{info.requirement}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Level Distribution */}
      {leaderboard && leaderboard.total > 0 && (
        <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle overflow-hidden">
          <div className="px-4 py-3 border-b border-nocturne-border-subtle">
            <h2 className="text-lg font-semibold text-nocturne-text-primary">Platform Level Distribution</h2>
          </div>
          <div className="p-4 space-y-3">
            {(['platinum', 'gold', 'silver', 'bronze'] as const).map((level) => {
              const count = leaderboard[`${level}_count` as keyof Leaderboard] as number;
              const pct = Math.round((count / leaderboard.total) * 100);
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-medium text-nocturne-text-secondary capitalize">{level}</span>
                  <div className="flex-1 bg-nocturne-surface-2 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${LEVEL_COLORS[level]}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm text-nocturne-text-tertiary text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-nocturne-border-subtle">
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Recent Activity</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-nocturne-text-tertiary">No activity yet. Start earning points!</div>
        ) : (
          <div className="divide-y divide-nocturne-border-subtle">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-nocturne-text-primary">
                    {ACTION_LABELS[txn.action_type] ?? txn.action_type}
                  </p>
                  <p className="text-sm text-nocturne-text-tertiary">
                    {new Date(txn.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="text-sm font-bold text-nocturne-success">+{txn.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
