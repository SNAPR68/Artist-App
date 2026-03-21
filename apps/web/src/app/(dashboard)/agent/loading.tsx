import { DashboardGridSkeleton, TableSkeleton } from '@/components/ui/SkeletonLoaders';

export default function AgentDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-300 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-surface-300 rounded w-1/2 animate-pulse" />
      </div>

      {/* Key metrics */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <DashboardGridSkeleton />
      </div>

      {/* Workspace overview section */}
      <div className="space-y-4">
        <div className="h-6 bg-surface-300 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-200 rounded-lg p-6 space-y-4">
              <div className="h-5 bg-surface-300 rounded w-2/3 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 bg-surface-300 rounded animate-pulse" />
                <div className="h-3 bg-surface-300 rounded w-5/6 animate-pulse" />
              </div>
              <div className="h-10 bg-surface-300 rounded animate-pulse mt-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent events */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}
