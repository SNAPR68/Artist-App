import { SearchResultsSkeleton, TableSkeleton, DashboardGridSkeleton } from '@/components/ui/SkeletonLoaders';

export default function ClientDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Search bar skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-surface-300 rounded w-1/4 animate-pulse" />
        <div className="h-12 bg-surface-200 rounded-lg animate-pulse" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-surface-300 rounded-full px-4 flex-shrink-0 animate-pulse min-w-max"
          />
        ))}
      </div>

      {/* Stats grid */}
      <DashboardGridSkeleton />

      {/* Search results */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <SearchResultsSkeleton />
      </div>

      {/* Bookings table */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
