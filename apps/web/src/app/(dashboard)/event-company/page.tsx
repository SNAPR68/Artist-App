'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Users,
  Building2,
  ArrowRight,
  Briefcase,
  DollarSign,
  AlertTriangle,
  FolderKanban,
  Presentation,
  TrendingUp,
  Mic,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface WorkspaceSummary {
  id: string;
  name: string;
  company_type: string;
  member_count: number;
  event_count: number;
}

export default function EventCompanyDashboard() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<WorkspaceSummary[]>('/v1/workspaces'),
      apiClient<{ data: unknown[]; meta: { total: number } }>('/v1/bookings?per_page=1'),
    ]).then(([wsRes, bookRes]) => {
      if (!wsRes.success && wsRes.errors?.[0]?.code === 'PROFILE_NOT_FOUND') {
        router.push('/event-company/onboarding');
        return;
      }
      if (wsRes.success) setWorkspaces(wsRes.data || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (bookRes.success) setBookingCount((bookRes.data as any)?.meta?.total ?? 0);
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

  const totalMembers = workspaces.reduce((sum, ws) => sum + (ws.member_count || 0), 0);
  const totalEvents = workspaces.reduce((sum, ws) => sum + (ws.event_count || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Hero ─── */}
      <section className="relative">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white leading-tight mb-2">
            Your events, <span className="text-[#c39bff] italic">sorted</span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl">
            Find artists, manage bookings, create proposals — everything for your next event.
          </p>
        </div>
      </section>

      {/* ─── Bento Grid: Voice + Insights ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Zara & Kabir — Voice Assistant Card */}
        <div className="md:col-span-8 glass-card rounded-xl p-6 border border-white/5 relative overflow-hidden flex flex-col">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#c39bff]/8 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h3 className="text-lg font-display font-bold text-white mb-0.5">Zara & Kabir</h3>
              <p className="text-white/40 text-xs">Your voice assistants — try &ldquo;Find me a singer for a corporate event in Delhi&rdquo;</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Click below</span>
              <div className="w-8 h-8 bg-[#c39bff]/20 rounded-full flex items-center justify-center border border-[#c39bff]/30">
                <Mic className="w-4 h-4 text-[#c39bff]" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hide relative z-10">
            <Link href="/search" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 whitespace-nowrap hover:bg-white/10 transition-colors">
              Find artists
            </Link>
            <Link href="/client/workspace" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 whitespace-nowrap hover:bg-white/10 transition-colors">
              Open workspace
            </Link>
            <Link href="/client/bookings" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 whitespace-nowrap hover:bg-white/10 transition-colors">
              Check bookings
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="md:col-span-4 glass-card rounded-xl p-8 border border-white/5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-display font-bold text-white">Overview</h3>
            <TrendingUp className="w-5 h-5 text-[#a1faff]" />
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-end border-b border-white/5 pb-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest">Workspaces</p>
                <p className="text-2xl font-bold text-white">{workspaces.length}</p>
              </div>
              <Building2 className="w-5 h-5 text-[#c39bff]" />
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest">Bookings</p>
                <p className="text-2xl font-bold text-white">{bookingCount}</p>
              </div>
              <Calendar className="w-5 h-5 text-[#a1faff]" />
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest">Team</p>
                <p className="text-2xl font-bold text-white">{totalMembers}</p>
              </div>
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest">Events</p>
                <p className="text-2xl font-bold text-white">{totalEvents}</p>
              </div>
              <Briefcase className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick Actions Bento ─── */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ActionCard href="/search" icon={Search} title="Find Artists" desc="Search by genre, city, budget" accent />
          <ActionCard href="/client/workspace" icon={FolderKanban} title="Workspace CRM" desc="Pipeline & team management" />
          <ActionCard href="/client/bookings" icon={Calendar} title="All Bookings" desc="Track & manage bookings" />
          <ActionCard href="/client/workspace" icon={Presentation} title="Presentations" desc="Create artist proposals" />
          <ActionCard href="/client/payments" icon={DollarSign} title="Payments" desc="Invoices & escrow" />
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
