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
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-white/40 to-white/30',
  gold: 'from-[#ffbf00] to-yellow-600',
  platinum: 'from-[#c39bff] to-[#8A2BE2]',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Hero */}
      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up relative z-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Achievements & Streaks</span>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Gamification Hub</h1>
          <p className="text-white/40 text-sm mt-1">Earn points, unlock badges, and climb the leaderboard</p>
        </div>
      </div>

      {/* Profile Stats */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
          <div className={`glass-card rounded-xl p-6 border border-white/5 bg-gradient-to-br ${LEVEL_COLORS[profile.level.toLowerCase()] || LEVEL_COLORS.bronze}`}>
            <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-1">Level</p>
            <p className="text-3xl font-black text-white">{profile.level}</p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Points</p>
            <p className="text-3xl font-black text-[#c39bff]">{profile.points}</p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Streak</p>
            <p className="text-3xl font-black text-[#ffbf00]">{profile.streak_days}🔥</p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Badges</p>
            <p className="text-3xl font-black text-[#a1faff]">{profile.badges.length}</p>
          </div>
        </div>
      )}

      {/* Badges */}
      {profile && profile.badges.length > 0 && (
        <section className="relative z-10">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Badges Earned</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {profile.badges.map((badge) => {
              const info = BADGE_INFO[badge.badge_type] || { label: badge.badge_type, requirement: 'Earn this badge' };
              return (
                <div key={badge.badge_type} className="glass-card rounded-xl p-6 border border-white/5 text-center">
                  <div className="text-4xl mb-2">⭐</div>
                  <p className="font-bold text-white text-sm mb-1">{info.label}</p>
                  <p className="text-xs text-white/40">Earned {new Date(badge.earned_at).toLocaleDateString('en-IN')}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Leaderboard */}
      {leaderboard && (
        <section className="relative z-10">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Leaderboard Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-black text-white">{leaderboard.bronze_count}</p>
              <p className="text-xs text-white/50 mt-1">Bronze</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-black text-white/70">{leaderboard.silver_count}</p>
              <p className="text-xs text-white/50 mt-1">Silver</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-black text-[#ffbf00]">{leaderboard.gold_count}</p>
              <p className="text-xs text-white/50 mt-1">Gold</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-black text-[#c39bff]">{leaderboard.platinum_count}</p>
              <p className="text-xs text-white/50 mt-1">Platinum</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-black text-[#a1faff]">{leaderboard.total}</p>
              <p className="text-xs text-white/50 mt-1">Total Artists</p>
            </div>
          </div>
        </section>
      )}

      {/* Points History */}
      {transactions.length > 0 && (
        <section className="relative z-10">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Recent Points Activity</h2>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((txn) => (
              <div key={txn.id} className="glass-card rounded-xl p-4 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">{ACTION_LABELS[txn.action_type] || txn.action_type}</p>
                  <p className="text-xs text-white/40">{new Date(txn.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <span className={`font-black ${txn.points >= 0 ? 'text-green-400' : 'text-[#ff8b9a]'}`}>
                  {txn.points >= 0 ? '+' : ''}{txn.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
