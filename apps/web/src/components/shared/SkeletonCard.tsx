'use client';

export function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-nocturne-border bg-nocturne-surface">
      <div className="skeleton-image" />
      <div className="p-4 space-y-3">
        <div className="skeleton-heading" />
        <div className="skeleton-text" />
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
        <div className="skeleton-text w-1/3" />
      </div>
    </div>
  );
}
