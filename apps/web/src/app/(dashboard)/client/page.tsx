'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import {
  Search,
  Calendar,
  Heart,
  Building2,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface ClientProfile {
  id: string;
  company_name?: string;
  city: string;
}

interface Shortlist {
  id: string;
  name: string;
  created_at: string;
}

const StatsSkeleton = () => (
  <div className="animate-pulse grid grid-cols-3 gap-4 mb-8">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="glass-card p-6 rounded-xl">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
        <div className="h-8 bg-white/10 rounded w-1/2" />
      </div>
    ))}
  </div>
);

const QuickActionsSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card p-6 rounded-xl">
          <div className="w-12 h-12 bg-white/10 rounded-lg mb-3" />
          <div className="h-4 bg-white/10 rounded w-4/5 mb-2" />
          <div className="h-3 bg-white/10 rounded w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

export default function ClientDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<ClientProfile>('/v1/clients/profile'),
      apiClient<Shortlist[]>('/v1/shortlists'),
    ]).then(([profileRes, shortlistRes]) => {
      if (!profileRes.success) {
        router.push('/client/onboarding');
        return;
      }
      setProfile(profileRes.data);
      if (shortlistRes.success) setShortlists(shortlistRes.data);
    }).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 bg-white/10 rounded-lg w-1/2 animate-pulse" />
        <StatsSkeleton />
        <QuickActionsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* First-run onboarding checklist */}
      <OnboardingChecklist />
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ─── Bento Hero ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Dashboard</span>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-1">
              {profile?.company_name ? `Welcome, ${profile.company_name}` : 'Client Dashboard'}
            </h1>
            <p className="text-white/40 text-sm">Find and book artists for your upcoming events</p>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#a1faff] animate-pulse shadow-[0_0_12px_rgba(161,250,255,0.5)]" />
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#a1faff]">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-white/40">Shortlists</span>
                <span className="text-sm font-bold text-white">{shortlists.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-white/40">City</span>
                <span className="text-sm font-bold text-white">{profile?.city ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <div className="glass-card rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">Active Bookings</p>
            <Calendar className="w-5 h-5 text-[#a1faff] group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-white">0</p>
          <p className="text-xs text-white/40 mt-2">Coming up soon</p>
        </div>

        <div className="glass-card rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">Shortlisted Artists</p>
            <Heart className="w-5 h-5 text-[#ff8b9a] group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-white">{shortlists.length}</p>
          <p className="text-xs text-white/40 mt-2">Ready to contact</p>
        </div>

        <div className="glass-card rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">Total Events</p>
            <Sparkles className="w-5 h-5 text-[#4ade80] group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-white">0</p>
          <p className="text-xs text-white/40 mt-2">Planned this year</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative z-10">
        <h2 className="text-xl font-display font-extrabold tracking-tighter text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href="/search"
            icon={Search}
            title="Find Artists"
            description="Search by genre, city, budget"
            isPrimary
          />
          <QuickActionCard
            href="/client/bookings"
            icon={Calendar}
            title="My Bookings"
            description="Track & manage"
          />
          <QuickActionCard
            href="/client/shortlists"
            icon={Heart}
            title="My Shortlists"
            description={`${shortlists.length} shortlist${shortlists.length !== 1 ? 's' : ''}`}
          />
          <QuickActionCard
            href="/client/workspace"
            icon={Building2}
            title="Workspace"
            description="Events & pipeline"
          />
          <QuickActionCard
            href="/client/recommendations"
            icon={Sparkles}
            title="Discover Artists"
            description="AI recommendations"
          />
          <QuickActionCard
            href="/client/substitutions"
            icon={AlertTriangle}
            title="Emergency Sub"
            description="Last-minute replacements"
          />
        </div>
      </div>

      {/* Recent Shortlists */}
      {shortlists.length > 0 && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-extrabold tracking-tighter text-white">Recent Shortlists</h2>
            <Link
              href="/client/shortlists"
              className="text-sm font-medium text-[#a1faff] hover:text-white transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {shortlists.slice(0, 5).map((sl) => (
              <Link
                key={sl.id}
                href={`/client/shortlists/${sl.id}`}
              >
                <div className="glass-card rounded-xl p-4 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white group-hover:text-[#c39bff] transition-colors">
                        {sl.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(sl.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-[#a1faff] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isPrimary?: boolean;
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  isPrimary = false,
}: QuickActionCardProps) {
  return (
    <Link href={href}>
      <div
        className={`rounded-xl p-6 border transition-all duration-300 h-full group cursor-pointer ${
          isPrimary
            ? `bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] border-[#c39bff]/30 hover:border-[#c39bff]/50 hover:shadow-[0_0_20px_rgba(195,155,255,0.3)]`
            : `glass-card border-white/10 hover:border-white/20 hover:bg-white/5`
        }`}
      >
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
            isPrimary
              ? 'bg-white/20'
              : `bg-white/5 border border-white/10`
          }`}
        >
          <Icon className={`w-6 h-6 ${isPrimary ? 'text-white' : 'text-[#c39bff]'}`} />
        </div>
        <h3
          className={`font-semibold mb-1 group-hover:translate-y-0 transition-all ${
            isPrimary
              ? 'text-white'
              : 'text-white group-hover:text-[#c39bff]'
          }`}
        >
          {title}
        </h3>
        <p className={`text-sm mb-3 ${isPrimary ? 'text-white/80' : 'text-white/60'}`}>
          {description}
        </p>
        <div
          className={`flex items-center text-xs font-medium group-hover:translate-x-1 transition-transform ${
            isPrimary ? 'text-white/70' : 'text-[#a1faff]'
          }`}
        >
          Explore <ArrowRight className="ml-1 w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}
