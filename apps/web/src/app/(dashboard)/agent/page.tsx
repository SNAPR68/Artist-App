'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wallet, TrendingUp, CheckCircle2, Clipboard } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface AgentProfile {
  id: string;
  agency_name: string;
  contact_person: string;
  phone: string;
  email: string;
  city: string;
  commission_pct: number;
  roster_count?: number;
}

interface RosterArtist {
  artist_id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  is_verified: boolean;
}

interface CommissionStats {
  total_commission_earned_paise: number;
  total_commission_pending_paise: number;
  total_commission_paid_paise: number;
}

const StatSkeleton = () => (
  <div className="glass-card p-6 rounded-2xl animate-pulse">
    <div className="h-4 bg-gradient-to-r from-primary-400/20 to-transparent rounded w-24 mb-3" />
    <div className="h-8 bg-gradient-to-r from-primary-400/30 to-transparent rounded w-20" />
  </div>
);

export default function AgentDashboard() {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [roster, setRoster] = useState<RosterArtist[]>([]);
  const [commissions, setCommissions] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<AgentProfile>('/v1/agents/profile'),
      apiClient<RosterArtist[]>('/v1/agents/roster'),
      apiClient<CommissionStats>('/v1/agents/commissions'),
    ]).then(([profileRes, rosterRes, commissionsRes]) => {
      if (profileRes.success) setProfile(profileRes.data);
      if (rosterRes.success) setRoster(rosterRes.data);
      if (commissionsRes.success) setCommissions(commissionsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full animate-spin" style={{ backgroundImage: 'conic-gradient(from 0deg, transparent 50%, rgba(168, 85, 247, 0.8))' }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="glass-card p-12 rounded-3xl">
          <h1 className="text-3xl font-bold text-gradient-nocturne mb-4">Welcome, Agent!</h1>
          <p className="text-nocturne-text-secondary mb-8">Set up your agency profile to start managing artists.</p>
          <Link
            href="/agent/onboarding"
            className="inline-block bg-gradient-nocturne text-white px-8 py-3 rounded-full font-semibold hover:shadow-nocturne-glow-sm transition-all"
          >
            Create Agency Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8 relative">
      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ─── Bento Hero ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 glass-card rounded-2xl p-10 border border-white/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-3 block">Agent Dashboard</span>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white mb-3">{profile.agency_name}</h1>
            <p className="text-white/50 text-sm font-medium">{profile.contact_person} · {profile.city}</p>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-2xl p-6 border border-white/10 flex flex-col justify-center gap-4">
          <Link
            href="/agent/roster"
            className="w-full py-4 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white rounded-xl text-sm font-bold text-center hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <Users size={18} />
            Manage Roster
          </Link>
          <Link
            href="/agent/bookings"
            className="w-full py-4 border border-[#c39bff]/30 bg-[#c39bff]/5 text-[#c39bff] hover:bg-[#c39bff]/10 hover:border-[#c39bff]/60 rounded-xl text-sm font-bold text-center transition-all"
          >
            View Bookings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="glass-card p-6 rounded-2xl hover:hover-glow transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-nocturne-text-secondary text-sm font-semibold uppercase tracking-wider">Artists</p>
                  <p className="text-3xl font-bold text-gradient-nocturne mt-2">{roster.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center">
                  <Users size={24} className="text-nocturne-accent" />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl hover:hover-glow transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-nocturne-text-secondary text-sm font-semibold uppercase tracking-wider">Commission</p>
                  <p className="text-3xl font-bold text-gradient-nocturne mt-2">{profile.commission_pct}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center">
                  <TrendingUp size={24} className="text-nocturne-accent" />
                </div>
              </div>
            </div>

            {commissions && (
              <>
                <div className="glass-card p-6 rounded-2xl hover:hover-glow transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nocturne-text-secondary text-sm font-semibold uppercase tracking-wider">Earned</p>
                      <p className="text-2xl font-bold text-emerald-400 mt-2">₹{(commissions.total_commission_earned_paise / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl hover:hover-glow transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nocturne-text-secondary text-sm font-semibold uppercase tracking-wider">Pending</p>
                      <p className="text-2xl font-bold text-amber-400 mt-2">₹{(commissions.total_commission_pending_paise / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
                      <Wallet size={24} className="text-amber-400" />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl hover:hover-glow transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nocturne-text-secondary text-sm font-semibold uppercase tracking-wider">Paid</p>
                      <p className="text-2xl font-bold text-blue-400 mt-2">₹{(commissions.total_commission_paid_paise / 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-blue-400" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-accent rounded-full" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/agent/bookings" className="group glass-card rounded-2xl p-6 hover:hover-glow transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clipboard size={24} className="text-nocturne-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-nocturne-text-primary">Booking Pipeline</p>
                <p className="text-nocturne-text-secondary text-sm mt-1">Manage and track all bookings</p>
              </div>
            </div>
          </Link>

          <Link href="/agent/commissions" className="group glass-card rounded-2xl p-6 hover:hover-glow transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={24} className="text-nocturne-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-nocturne-text-primary">Commission Dashboard</p>
                <p className="text-nocturne-text-secondary text-sm mt-1">Track earnings and payouts</p>
              </div>
            </div>
          </Link>

          <Link href="/agent/roster" className="group glass-card rounded-2xl p-6 hover:hover-glow transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={24} className="text-nocturne-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-nocturne-text-primary">Manage Roster</p>
                <p className="text-nocturne-text-secondary text-sm mt-1">Add and manage your artists</p>
              </div>
            </div>
          </Link>

          <Link href="/agent/recommendations" className="group glass-card rounded-2xl p-6 hover:hover-glow transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={24} className="text-nocturne-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-nocturne-text-primary">AI Recommendations</p>
                <p className="text-nocturne-text-secondary text-sm mt-1">Get booking suggestions</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Roster Preview */}
      <div>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-accent rounded-full" />
          Your Artists
        </h2>
        {roster.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Users size={48} className="mx-auto text-nocturne-text-secondary/40 mb-4" />
            <p className="text-nocturne-text-secondary mb-4">No artists in your roster yet.</p>
            <Link href="/agent/roster" className="text-nocturne-accent text-sm font-semibold hover:text-nocturne-accent transition-colors">
              Add artists to your roster
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roster.slice(0, 6).map((artist) => (
              <div key={artist.artist_id} className="glass-card rounded-2xl p-6 hover:hover-glow transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-nocturne-text-primary group-hover:text-nocturne-accent transition-colors">{artist.stage_name}</h3>
                    <p className="text-nocturne-text-secondary text-sm mt-1">{artist.base_city}</p>
                  </div>
                  {artist.is_verified && (
                    <div className="flex-shrink-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full p-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {artist.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-primary-400/20 to-primary-600/20 text-nocturne-accent">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {roster.length > 6 && (
          <Link href="/agent/roster" className="text-nocturne-accent text-sm font-semibold mt-4 inline-block hover:text-nocturne-accent transition-colors">
            View all {roster.length} artists →
          </Link>
        )}
      </div>
    </div>
  );
}
