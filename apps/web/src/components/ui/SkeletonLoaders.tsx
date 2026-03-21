'use client';

/**
 * Reusable skeleton loader components for various UI patterns
 * Used in loading.tsx files to show placeholders while content loads
 */

export function CardSkeleton() {
  return (
    <div className="bg-surface-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-surface-300 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-surface-300 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-surface-300 rounded w-1/2 mt-2 animate-pulse" />
        </div>
      </div>
      {/* Content lines */}
      <div className="space-y-3">
        <div className="h-3 bg-surface-300 rounded animate-pulse" />
        <div className="h-3 bg-surface-300 rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-surface-300 rounded w-4/6 animate-pulse" />
      </div>
      {/* Footer */}
      <div className="flex gap-2 pt-4">
        <div className="h-9 bg-surface-300 rounded px-4 flex-1 animate-pulse" />
        <div className="h-9 bg-surface-300 rounded px-4 flex-1 animate-pulse" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 items-center px-4 py-3 bg-surface-200 rounded-lg">
        <div className="w-8 h-8 bg-surface-300 rounded animate-pulse" />
        <div className="h-4 bg-surface-300 rounded flex-1 animate-pulse" />
        <div className="h-4 bg-surface-300 rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-surface-300 rounded w-1/4 animate-pulse" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4 py-3 bg-surface-200 rounded-lg">
          <div className="w-8 h-8 bg-surface-300 rounded animate-pulse" />
          <div className="h-3 bg-surface-300 rounded flex-1 animate-pulse" />
          <div className="h-3 bg-surface-300 rounded w-1/4 animate-pulse" />
          <div className="h-3 bg-surface-300 rounded w-1/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 8 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4 bg-surface-200 rounded-lg">
          <div className="w-16 h-16 bg-surface-300 rounded-lg flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-300 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-surface-300 rounded w-full animate-pulse" />
            <div className="h-3 bg-surface-300 rounded w-2/3 animate-pulse" />
          </div>
          <div className="w-20 h-9 bg-surface-300 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header/Cover */}
      <div className="h-32 bg-surface-300 rounded-lg animate-pulse" />

      {/* Profile Info */}
      <div className="px-6 pb-6 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-end gap-4 -mt-16 pb-4">
          <div className="w-32 h-32 bg-surface-300 rounded-full border-4 border-surface-bg animate-pulse" />
          <div className="flex-1">
            <div className="h-6 bg-surface-300 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-surface-300 rounded w-1/2 mt-2 animate-pulse" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-t border-surface-300">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-6 bg-surface-300 rounded w-1/2 mx-auto animate-pulse" />
              <div className="h-3 bg-surface-300 rounded w-3/4 mx-auto mt-2 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="h-3 bg-surface-300 rounded animate-pulse" />
          <div className="h-3 bg-surface-300 rounded w-5/6 animate-pulse" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <div className="h-10 bg-surface-300 rounded-lg flex-1 animate-pulse" />
          <div className="h-10 bg-surface-300 rounded-lg flex-1 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-surface-300 rounded w-1/4 animate-pulse" />
          <div className="h-10 bg-surface-300 rounded animate-pulse" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-surface-300 rounded px-6 w-24 animate-pulse" />
        <div className="h-10 bg-surface-300 rounded px-6 w-24 animate-pulse" />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-surface-200 rounded-lg hover:bg-surface-300 transition-colors">
          <div className="w-20 h-20 bg-surface-300 rounded-lg flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-surface-300 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-surface-300 rounded w-1/2 animate-pulse" />
            <div className="flex gap-2 pt-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-5 bg-surface-300 rounded-full w-16 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="h-10 bg-surface-300 rounded px-4 w-24 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-surface-200 rounded-lg p-6 space-y-3">
          <div className="h-4 bg-surface-300 rounded w-2/3 animate-pulse" />
          <div className="h-8 bg-surface-300 rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-surface-300 rounded w-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function SpinnerLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className={`${sizeClass} relative`}>
      <div className="absolute inset-0 rounded-full border-2 border-surface-300" />
      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
