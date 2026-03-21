import { FormSkeleton } from '@/components/ui/SkeletonLoaders';

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-bg p-4">
      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo skeleton */}
        <div className="text-center">
          <div className="h-8 bg-surface-300 rounded w-32 mx-auto animate-pulse" />
        </div>

        {/* Auth card skeleton */}
        <div className="bg-surface-200 rounded-lg p-8 space-y-6 shadow-lg">
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="h-6 bg-surface-300 rounded w-2/3 mx-auto animate-pulse" />
            <div className="h-4 bg-surface-300 rounded w-3/4 mx-auto animate-pulse" />
          </div>

          {/* Form fields */}
          <FormSkeleton />

          {/* OR divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-surface-300" />
            <div className="h-4 bg-surface-300 rounded w-8 animate-pulse" />
            <div className="flex-1 h-px bg-surface-300" />
          </div>

          {/* Social buttons */}
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-300 rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Footer link */}
          <div className="text-center space-y-2">
            <div className="h-3 bg-surface-300 rounded w-1/2 mx-auto animate-pulse" />
            <div className="h-3 bg-surface-300 rounded w-2/3 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
