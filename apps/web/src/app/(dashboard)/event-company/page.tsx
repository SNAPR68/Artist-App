'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Users,
  Building2,
  Mic,
  ArrowRight,
  Briefcase,
  DollarSign,
  AlertTriangle,
  Sparkles,
  FolderKanban,
  Presentation,
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
      if (bookRes.success) setBookingCount((bookRes.data as any)?.meta?.total ?? 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded-lg w-2/3 animate-pulse" />
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 rounded-xl">
              <div className="h-4 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-6 rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded-lg mb-3" />
              <div className="h-4 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-4/5 mb-2" />
              <div className="h-3 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalMembers = workspaces.reduce((sum, ws) => sum + (ws.member_count || 0), 0);
  const totalEvents = workspaces.reduce((sum, ws) => sum + (ws.event_count || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-heading font-bold text-text-primary mb-2">
          Event Company HQ
        </h1>
        <p className="text-text-muted text-lg">
          Manage events, book artists, and create presentations — all from one place
        </p>
      </div>

      {/* Voice Command Tip */}
      <div className="glass-card rounded-xl p-4 border border-primary-500/30 bg-primary-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Voice Commands Available</p>
            <p className="text-xs text-text-muted">
              Try: &quot;Find DJs in Mumbai&quot; · &quot;Go to my bookings&quot; · &quot;Create a presentation&quot; · &quot;Show my pipeline&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Workspaces"
          value={workspaces.length}
          subtitle="Active CRMs"
          icon={Building2}
          iconColor="text-primary-400"
        />
        <StatCard
          label="Total Bookings"
          value={bookingCount}
          subtitle="All time"
          icon={Calendar}
          iconColor="text-accent-magenta"
        />
        <StatCard
          label="Team Members"
          value={totalMembers}
          subtitle="Across workspaces"
          icon={Users}
          iconColor="text-success"
        />
        <StatCard
          label="Events Managed"
          value={totalEvents}
          subtitle="This year"
          icon={Sparkles}
          iconColor="text-warning"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-heading font-bold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href="/search"
            icon={Search}
            title="Find Artists"
            description="Search by genre, city, budget"
            gradientFrom="from-primary-500"
            gradientTo="to-primary-600"
            isPrimary
          />
          <QuickActionCard
            href="/client/workspace"
            icon={FolderKanban}
            title="Workspace CRM"
            description="Pipeline & team"
            gradientFrom="from-blue-500"
            gradientTo="to-cyan-600"
          />
          <QuickActionCard
            href="/client/bookings"
            icon={Calendar}
            title="All Bookings"
            description="Track & manage"
            gradientFrom="from-accent-magenta"
            gradientTo="to-pink-600"
          />
          <QuickActionCard
            href="/client/workspace"
            icon={Presentation}
            title="Presentations"
            description="Create artist proposals"
            gradientFrom="from-violet-500"
            gradientTo="to-purple-600"
          />
          <QuickActionCard
            href="/client/payments"
            icon={DollarSign}
            title="Payments"
            description="Invoices & contracts"
            gradientFrom="from-emerald-500"
            gradientTo="to-green-600"
          />
          <QuickActionCard
            href="/client/substitutions"
            icon={AlertTriangle}
            title="Emergency Sub"
            description="Last-minute replacements"
            gradientFrom="from-orange-500"
            gradientTo="to-red-600"
          />
        </div>
      </div>

      {/* Active Workspaces */}
      {workspaces.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-text-primary">Your Workspaces</h2>
            <Link
              href="/client/workspace"
              className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
            >
              Manage all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workspaces.slice(0, 4).map((ws) => (
              <Link key={ws.id} href={`/client/workspace/${ws.id}`}>
                <div className="glass-card rounded-xl p-5 border glass-border hover:border-primary-500/50 hover:shadow-glow-sm transition-all group cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary group-hover:text-primary-300 transition-colors">
                        {ws.name}
                      </h3>
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 mt-1">
                        {ws.company_type?.replace(/_/g, ' ') || 'general'}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws.member_count || 0} members</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {ws.event_count || 0} events</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 border glass-border text-center">
          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No workspaces yet</h3>
          <p className="text-text-muted text-sm mb-4">Create your first workspace to start managing events and booking artists</p>
          <Link
            href="/client/workspace"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-accent text-white rounded-lg font-medium hover-glow transition-all"
          >
            <Building2 className="w-4 h-4" /> Create Workspace
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtitle, icon: Icon, iconColor }: {
  label: string; value: number; subtitle: string; icon: React.ComponentType<{ className?: string }>; iconColor: string;
}) {
  return (
    <div className="glass-card rounded-xl p-6 border glass-border hover:border-primary-500/50 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-muted font-medium">{label}</p>
        <Icon className={`w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform`} />
      </div>
      <p className="text-3xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-2">{subtitle}</p>
    </div>
  );
}

function QuickActionCard({ href, icon: Icon, title, description, gradientFrom, gradientTo, isPrimary = false }: {
  href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string;
  gradientFrom: string; gradientTo: string; isPrimary?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`rounded-xl p-6 border transition-all duration-300 h-full group cursor-pointer ${
        isPrimary
          ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} border-primary-500/30 hover:border-primary-400 hover:shadow-glow-sm`
          : `glass-card glass-border hover:border-primary-500/50 hover:shadow-glow-sm`
      }`}>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
          isPrimary ? 'bg-white/20' : `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
        }`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className={`font-semibold mb-1 transition-all ${isPrimary ? 'text-white' : 'text-text-primary group-hover:text-primary-300'}`}>
          {title}
        </h3>
        <p className={`text-sm mb-3 ${isPrimary ? 'text-white/80' : 'text-text-muted'}`}>{description}</p>
        <div className={`flex items-center text-xs font-medium group-hover:translate-x-1 transition-transform ${isPrimary ? 'text-white/70' : 'text-primary-400'}`}>
          Explore <ArrowRight className="ml-1 w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}
