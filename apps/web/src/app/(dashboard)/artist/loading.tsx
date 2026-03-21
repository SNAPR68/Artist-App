import { ProfileSkeleton, TableSkeleton } from '@/components/ui/SkeletonLoaders';

export default function ArtistDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Navigation tabs skeleton */}
      <div className="flex gap-4 border-b border-surface-300">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-surface-300 rounded w-24 animate-pulse"
          />
        ))}
      </div>

      {/* Profile section */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <ProfileSkeleton />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-200 rounded-lg p-6 space-y-3"
          >
            <div className="h-4 bg-surface-300 rounded w-3/4 animate-pulse" />
            <div className="h-8 bg-surface-300 rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-surface-300 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Recent activity table */}
      <div>
        <div className="h-6 bg-surface-300 rounded w-1/4 mb-6 animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
