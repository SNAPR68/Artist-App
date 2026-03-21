import { DashboardGridSkeleton } from '@/components/ui/SkeletonLoaders';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Header skeleton */}
      <div className="border-b border-surface-300 bg-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
          <div className="h-8 bg-surface-300 rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-surface-300 rounded w-1/2 animate-pulse" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardGridSkeleton />

        {/* Additional sections */}
        <div className="mt-12 space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 bg-surface-300 rounded w-1/4 animate-pulse" />
              <div className="h-64 bg-surface-200 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
