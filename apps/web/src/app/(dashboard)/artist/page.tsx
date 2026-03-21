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

const StatsSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-card p-6 rounded-xl">
          <div className="h-4 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-3/4 mb-3" />
          <div className="h-8 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

const QuickActionsSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="glass-card p-6 rounded-xl">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded-lg mb-3" />
          <div className="h-4 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-4/5 mb-2" />
          <div className="h-3 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

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
        <div className="h-10 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded-lg w-1/3 animate-pulse" />
        <StatsSkeleton />
        <QuickActionsSkeleton />
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="glass-card rounded-2xl p-12 text-center max-w-md">
          <h1 className="text-3xl font-heading font-bold text-text-primary mb-4">
            Welcome to ArtistBooking!
          </h1>
          <p className="text-text-muted mb-8 leading-relaxed">
            Complete your artist profile to start receiving premium booking opportunities.
          </p>
          <Link
            href="/artist/onboarding"
            className="inline-flex items-center justify-center bg-gradient-accent hover-glow px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300"
          >
            Create Your Profile
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-heading font-bold text-text-primary">
              {profile!.stage_name}
            </h1>
            {profile!.is_verified && (
              <BadgeCheck className="w-8 h-8 text-accent-magenta animate-fade-in" />
            )}
          </div>
          <p className="text-text-muted text-lg">
            Welcome back! Keep your momentum going this month.
          </p>
        </div>
      </div>

      {/* Profile Completion */}
      {profile!.profile_completion_pct < 100 && (
        <div className="glass-card rounded-xl p-6 border glass-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Profile Completion</h3>
            <span className="text-sm font-bold text-gradient">
              {profile!.profile_completion_pct}%
            </span>
          </div>
          <div className="w-full bg-surface-card rounded-full h-2 overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-magenta transition-all duration-500"
              style={{ width: `${profile!.profile_completion_pct}%` }}
            />
          </div>
          <Link
            href="/artist/profile"
            className="inline-flex items-center text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            Complete your profile to unlock more opportunities
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-6 border glass-border hover:border-primary-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-muted font-medium">Total Bookings</p>
            <Calendar className="w-5 h-5 text-primary-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-text-primary mb-2">
            {profile!.total_bookings ?? 0}
          </p>
          <div className="flex items-center text-xs text-success">
            <span>↑ 12% this month</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 border glass-border hover:border-primary-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-muted font-medium">Trust Score</p>
            <Shield className="w-5 h-5 text-accent-magenta group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-text-primary mb-2">
            {profile!.trust_score ?? 0}%
          </p>
          <div className="w-full bg-surface-card rounded-full h-1.5">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-magenta rounded-full"
              style={{ width: `${(profile!.trust_score ?? 0)}%` }}
            />
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 border glass-border hover:border-primary-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-muted font-medium">Earnings This Month</p>
            <IndianRupee className="w-5 h-5 text-success group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-text-primary mb-2">
            ₹{(profile!.earnings_this_month ?? 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center text-xs text-success">
            <span>✓ Payment pending</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 border glass-border hover:border-primary-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-muted font-medium">Profile Views</p>
            <Eye className="w-5 h-5 text-primary-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-text-primary mb-2">
            {profile!.profile_views ?? 0}
          </p>
          <div className="flex items-center text-xs text-primary-400">
            <span>This week</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-heading font-bold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href="/artist/calendar"
            icon={CalendarDays}
            title="Calendar"
            description="Set your availability"
            gradientFrom="from-primary-500"
            gradientTo="to-primary-600"
          />
          <QuickActionCard
            href="/artist/bookings"
            icon={Calendar}
            title="Bookings"
            description="Manage your gigs"
            gradientFrom="from-accent-magenta"
            gradientTo="to-pink-600"
          />
          <QuickActionCard
            href="/artist/earnings"
            icon={Wallet}
            title="Earnings"
            description="Payment history"
            gradientFrom="from-success"
            gradientTo="to-emerald-600"
          />
          <QuickActionCard
            href="/artist/financial"
            icon={BarChart3}
            title="Financial Center"
            description="Escrow, tax, forecast"
            gradientFrom="from-blue-500"
            gradientTo="to-cyan-600"
          />
          <QuickActionCard
            href="/artist/intelligence"
            icon={Brain}
            title="Career Intelligence"
            description="Insights & trends"
            gradientFrom="from-purple-500"
            gradientTo="to-indigo-600"
          />
          <QuickActionCard
            href="/artist/intelligence"
            icon={TrendingUp}
            title="Seasonal Demand"
            description="Peak & valley alerts"
            gradientFrom="from-orange-500"
            gradientTo="to-red-600"
          />
          <QuickActionCard
            href="/gigs"
            icon={Target}
            title="Gig Marketplace"
            description="Browse opportunities"
            gradientFrom="from-teal-500"
            gradientTo="to-cyan-600"
          />
          <QuickActionCard
            href="/artist/gamification"
            icon={Trophy}
            title="Achievements"
            description="Badges & streaks"
            gradientFrom="from-yellow-500"
            gradientTo="to-amber-600"
          />
          <QuickActionCard
            href="/artist/onboarding"
            icon={UserCog}
            title="Edit Profile"
            description="Photos, bio, pricing"
            gradientFrom="from-rose-500"
            gradientTo="to-pink-600"
          />
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
}: QuickActionCardProps) {
  return (
    <Link href={href}>
      <div className="glass-card rounded-xl p-6 border glass-border hover:border-primary-500/50 transition-all duration-300 h-full hover:shadow-glow-sm group cursor-pointer">
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-text-primary mb-1 group-hover:text-primary-300 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-text-muted mb-3">{description}</p>
        <div className="flex items-center text-primary-400 text-xs font-medium group-hover:translate-x-1 transition-transform">
          Explore <ArrowRight className="ml-1 w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}
