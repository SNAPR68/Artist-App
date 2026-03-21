import { DashboardGridSkeleton, TableSkeleton } from '@/components/ui/SkeletonLoaders';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-300 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-surface-300 rounded w-1/2 animate-pulse" />
      </div>

      {/* System metrics */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <DashboardGridSkeleton />
      </div>

      {/* Admin controls toolbar */}
      <div className="flex gap-3 p-4 bg-surface-200 rounded-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-surface-300 rounded px-4 animate-pulse" />
        ))}
      </div>

      {/* Users management table */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <TableSkeleton rows={8} />
      </div>

      {/* System logs */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <div className="bg-surface-200 rounded-lg p-4 space-y-3 font-mono text-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 bg-surface-300 rounded w-full animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
