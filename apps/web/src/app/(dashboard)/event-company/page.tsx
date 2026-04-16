'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Heart,
  Star,
  Users,
  Building2,
  ArrowRight,
  Briefcase,
  AlertTriangle,
  FolderKanban,
  Presentation,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface EventCompanyProfile {
  id: string;
  company_name?: string;
  client_type?: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  company_type: string;
  member_count: number;
  event_count: number;
}

interface ShortlistSummary {
  id: string;
  name: string;
  created_at: string;
}

export default function EventCompanyDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<EventCompanyProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<EventCompanyProfile>('/v1/clients/profile'),
      apiClient<WorkspaceSummary[]>('/v1/workspaces'),
      apiClient<ShortlistSummary[]>('/v1/shortlists'),
    ]).then(([profileRes, wsRes, shortlistRes]) => {
      if (!profileRes.success) {
        router.push('/event-company/onboarding');
        return;
      }
      setProfile(profileRes.data);
      if (wsRes.success) setWorkspaces(wsRes.data || []);
      if (shortlistRes.success) setShortlists(shortlistRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 nocturne-skeleton w-2/3 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 nocturne-skeleton h-[300px] rounded-xl" />
          <div className="md:col-span-4 nocturne-skeleton h-[300px] rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="nocturne-skeleton h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const companyName = profile?.company_name || 'Event Company';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Hero ─── */}
      <section className="relative">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white leading-tight mb-1">
            Welcome, {companyName}
          </h1>
          <p className="text-white/50 text-base md:text-lg max-w-xl">
            Find and book artists for your events
          </p>
        </div>
      </section>

      {/* ─── Primary Tiles (match mock) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Find Artists */}
        <Link
          href="/search"
          className="md:col-span-8 rounded-2xl p-10 border border-[#3B82F6]/30 bg-[#3B82F6] hover:bg-[#2F74F2] transition-colors relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center mb-6">
              <Search className="w-5 h-5 text-white/95" />
            </div>
            <h3 className="text-2xl font-display font-extrabold tracking-tight text-white mb-2">
              Find Artists
            </h3>
            <p className="text-white/80 text-sm">
              Search by genre, city, budget
            </p>
          </div>
        </Link>

        {/* My Shortlists */}
        <Link
          href="/client/shortlists"
          className="md:col-span-4 rounded-2xl p-10 bg-white border border-black/5 hover:border-black/10 transition-all group shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
        >
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-[#ffbf00]/15 border border-[#ffbf00]/25 flex items-center justify-center mb-6">
              <Star className="w-5 h-5 text-[#ffbf00]" />
            </div>
            <h3 className="text-2xl font-display font-extrabold tracking-tight text-black mb-2">
              My Shortlists
            </h3>
            <p className="text-black/50 text-sm">{shortlists.length} shortlists</p>
          </div>
        </Link>
      </div>

      {/* ─── Quick Actions Bento ─── */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ActionCard href="/search" icon={Search} title="Find Artists" desc="Search by genre, city, budget" accent />
          <ActionCard href="/client/shortlists" icon={Heart} title="My Shortlists" desc={`${shortlists.length} shortlist${shortlists.length !== 1 ? 's' : ''}`} />
          <ActionCard href="/client/workspace" icon={FolderKanban} title="Workspace CRM" desc="Pipeline & team management" />
          <ActionCard href="/client/bookings" icon={Calendar} title="All Bookings" desc="Track & manage bookings" />
          <ActionCard href="/client/workspace" icon={Presentation} title="Presentations" desc="Create artist proposals" />
          <ActionCard href="/client/substitutions" icon={AlertTriangle} title="Emergency Sub" desc="Last-minute replacements" />
        </div>
      </div>

      {/* ─── Active Workspaces ─── */}
      {workspaces.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold text-white">Your Workspaces</h2>
            <Link href="/client/workspace" className="text-sm font-medium text-[#c39bff] hover:text-[#a1faff] transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workspaces.slice(0, 4).map((ws) => (
              <Link key={ws.id} href={`/client/workspace/${ws.id}`}>
                <div className="glass-card rounded-xl p-5 border border-white/5 hover:border-white/15 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#c39bff] transition-colors">{ws.name}</h3>
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#c39bff]/15 text-[#a1faff] mt-1">
                        {ws.company_type?.replace(/_/g, ' ') || 'general'}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-[#c39bff] group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws.member_count || 0} members</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {ws.event_count || 0} events</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 border border-white/5 text-center">
          <Building2 className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No workspaces yet</h3>
          <p className="text-white/50 text-sm mb-4">Create your first workspace to start managing events and booking artists</p>
          <Link
            href="/client/workspace"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] text-white rounded-lg font-medium hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] transition-all"
          >
            <Building2 className="w-4 h-4" /> Create Workspace
          </Link>
        </div>
      )}
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc, accent = false }: {
  href: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`rounded-xl p-6 border transition-all h-full group cursor-pointer ${
        accent
          ? 'bg-gradient-to-br from-[#c39bff]/20 to-[#8A2BE2]/10 border-[#c39bff]/20 hover:border-[#c39bff]/40'
          : 'glass-card border-white/5 hover:border-white/15'
      } hover:shadow-[0_0_20px_rgba(195,155,255,0.15)]`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
          accent ? 'bg-[#c39bff]/30' : 'bg-white/5'
        }`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-[#c39bff]' : 'text-white/60'}`} />
        </div>
        <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-[#c39bff] transition-colors">{title}</h3>
        <p className="text-xs text-white/40">{desc}</p>
      </div>
    </Link>
  );
}
