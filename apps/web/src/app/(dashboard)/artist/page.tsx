'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Calendar,
  Wallet,
  BarChart3,
  Brain,
  TrendingUp,
  Target,
  Trophy,
  UserCog,
  Eye,
  Shield,
  IndianRupee,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface ArtistProfile {
  id: string;
  stage_name: string;
  bio: string;
  profile_completion_pct: number;
  total_bookings: number;
  trust_score: number;
  is_verified: boolean;
  profile_views?: number;
  earnings_this_month?: number;
}

export default function ArtistHomePage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    apiClient<ArtistProfile>('/v1/artists/profile')
      .then((res) => {
        if (res.success) {
          setProfile(res.data);
        } else {
          setNoProfile(true);
        }
      })
      .catch(() => setNoProfile(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 nocturne-skeleton w-1/3 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 nocturne-skeleton h-[280px] rounded-xl" />
          <div className="md:col-span-4 nocturne-skeleton h-[280px] rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="nocturne-skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="glass-card rounded-2xl p-12 text-center max-w-md border border-white/5">
          <h1 className="text-3xl font-display font-bold text-white mb-4">Welcome to ArtistBook!</h1>
          <p className="text-white/50 mb-8 leading-relaxed">
            Complete your profile to start receiving booking opportunities from event companies across India.
          </p>
          <Link
            href="/artist/onboarding"
            className="inline-flex items-center justify-center bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(195,155,255,0.3)]"
          >
            Create Your Profile <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="space-y-8 animate-fade-in">
      {/* ─── Hero Header ─── */}
      <section className="relative">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">
                {profile?.stage_name}
              </h1>
              {profile?.is_verified && <BadgeCheck className="w-7 h-7 text-[#c39bff]" />}
            </div>
            <p className="text-white/50 text-lg">Welcome back. Here&apos;s your overview.</p>
          </div>
          {/* Escrow Balance */}
          <div className="flex items-center gap-4 glass-card px-6 py-4 rounded-xl border border-white/5">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#a1faff] font-bold">Earnings This Month</span>
              <p className="text-2xl font-extrabold text-white">₹{(profile?.earnings_this_month ?? 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <Wallet className="w-7 h-7 text-[#c39bff]" />
          </div>
        </div>
      </section>

      {/* ─── Profile Completion ─── */}
      {(profile?.profile_completion_pct ?? 0) < 100 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">Profile Completion</h3>
            <span className="text-sm font-bold text-[#c39bff]">{profile?.profile_completion_pct}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#c39bff] to-[#a1faff] rounded-full transition-all duration-500"
              style={{ width: `${profile?.profile_completion_pct}%` }}
            />
          </div>
          <Link href="/artist/profile" className="text-xs font-medium text-[#a1faff] hover:text-white transition-colors flex items-center gap-1">
            Complete to unlock more bookings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ─── Bento Grid: Next Booking + AI ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Card */}
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#c39bff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="bg-[#c39bff]/15 text-[#c39bff] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#c39bff]/20">
                  Dashboard
                </span>
                <h2 className="text-2xl font-bold mt-3 text-white">Your Performance</h2>
                <p className="text-white/40 mt-1">Keep your momentum going this month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatMini label="Bookings" value={String(profile?.total_bookings ?? 0)} icon={Calendar} color="text-[#a1faff]" />
              <StatMini label="Trust Score" value={`${profile?.trust_score ?? 0}%`} icon={Shield} color="text-[#c39bff]" />
              <StatMini label="Profile Views" value={String(profile?.profile_views ?? 0)} icon={Eye} color="text-[#a1faff]" />
              <StatMini label="Earnings" value={`₹${(profile?.earnings_this_month ?? 0).toLocaleString('en-IN')}`} icon={IndianRupee} color="text-green-400" highlight />
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="md:col-span-4 glass-card rounded-xl p-8 border border-white/5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#a1faff] animate-pulse shadow-[0_0_12px_rgba(161,250,255,0.5)]" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#a1faff]">Backstage AI</h3>
          </div>
          <div className="space-y-4">
            <ProgressBar label="Trust Score" value={profile?.trust_score ?? 0} color="bg-[#a1faff]" />
            <ProgressBar label="Profile Completion" value={profile?.profile_completion_pct ?? 0} color="bg-[#c39bff]" />
          </div>
          <div className="mt-2 p-4 rounded-xl bg-white/3 border border-white/5 italic text-sm text-white/40">
            &ldquo;Keep accepting bookings to boost your trust score and unlock premium visibility.&rdquo;
          </div>
          <Link
            href="/artist/intelligence"
            className="mt-auto w-full py-3 rounded-xl border border-[#a1faff]/20 text-[#a1faff] text-xs font-bold uppercase tracking-widest hover:bg-[#a1faff]/5 transition-all flex items-center justify-center gap-2"
          >
            <Brain className="w-4 h-4" /> View Insights
          </Link>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ActionCard href="/artist/calendar" icon={CalendarDays} title="Calendar" desc="Set your availability" />
          <ActionCard href="/artist/bookings" icon={Calendar} title="Bookings" desc="Manage your gigs" />
          <ActionCard href="/artist/earnings" icon={Wallet} title="Earnings" desc="Payment history" />
          <ActionCard href="/artist/financial" icon={BarChart3} title="Financial" desc="Escrow & payouts" />
          <ActionCard href="/artist/intelligence" icon={Brain} title="Intelligence" desc="Career insights" />
          <ActionCard href="/artist/seasonal" icon={TrendingUp} title="Demand" desc="Seasonal trends" />
          <ActionCard href="/gigs" icon={Target} title="Gig Market" desc="Browse opportunities" />
          <ActionCard href="/artist/gamification" icon={Trophy} title="Achievements" desc="Badges & streaks" />
          <ActionCard href="/artist/profile" icon={UserCog} title="Edit Profile" desc="Photos, bio, pricing" />
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}

function StatMini({ label, value, icon: Icon, color, highlight = false }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white/5 p-4 rounded-lg ${highlight ? 'border border-[#c39bff]/20' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-lg font-bold ${highlight ? 'text-[#c39bff]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-white">{label}</span>
        <span className={`text-xs ${color === 'bg-[#a1faff]' ? 'text-[#a1faff]' : 'text-[#c39bff]'}`}>{value}%</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full shadow-[0_0_8px_rgba(161,250,255,0.3)]`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc }: {
  href: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string;
}) {
  return (
    <Link href={href}>
      <div className="glass-card rounded-xl p-5 border border-white/5 hover:border-white/15 transition-all h-full group cursor-pointer hover:shadow-[0_0_20px_rgba(195,155,255,0.1)]">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-3 group-hover:bg-[#c39bff]/10 transition-colors">
          <Icon className="w-5 h-5 text-white/50 group-hover:text-[#c39bff] transition-colors" />
        </div>
        <h3 className="font-semibold text-white text-sm mb-0.5 group-hover:text-[#c39bff] transition-colors">{title}</h3>
        <p className="text-xs text-white/40">{desc}</p>
      </div>
    </Link>
  );
}
