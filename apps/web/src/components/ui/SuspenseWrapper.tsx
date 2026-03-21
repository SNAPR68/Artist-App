import React, { Suspense, ReactNode } from 'react';
import { SpinnerLoader } from './SkeletonLoaders';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Reusable Suspense wrapper for streaming UI components
 * Provides a consistent fallback while data is loading
 */
export function SuspenseWrapper({
  children,
  fallback,
}: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback || <DefaultFallback />}>
      {children}
    </Suspense>
  );
}

/**
 * Default loading fallback - a centered spinner
 */
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <SpinnerLoader size="lg" />
    </div>
  );
}

/**
 * Suspense wrapper for cards
 */
export function CardSuspense({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Suspense fallback={fallback || <CardLoadingFallback />}>
      {children}
    </Suspense>
  );
}

function CardLoadingFallback() {
  return (
    <div className="bg-surface-200 rounded-lg p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-surface-300 rounded w-1/2" />
      <div className="space-y-2">
        <div className="h-3 bg-surface-300 rounded w-full" />
        <div className="h-3 bg-surface-300 rounded w-4/5" />
      </div>
    </div>
  );
}

/**
 * Suspense wrapper for data tables
 */
export function TableSuspense({
  children,
  rows = 5,
}: {
  children: ReactNode;
  rows?: number;
}) {
  return (
    <Suspense fallback={<TableLoadingFallback rows={rows} />}>
      {children}
    </Suspense>
  );
}

function TableLoadingFallback({ rows = 5 }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-surface-200 rounded-lg animate-pulse">
          <div className="w-8 h-8 bg-surface-300 rounded" />
          <div className="h-3 bg-surface-300 rounded flex-1" />
          <div className="h-3 bg-surface-300 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Suspense wrapper for lists
 */
export function ListSuspense({
  children,
  items = 5,
}: {
  children: ReactNode;
  items?: number;
}) {
  return (
    <Suspense fallback={<ListLoadingFallback items={items} />}>
      {children}
    </Suspense>
  );
}

function ListLoadingFallback({ items = 5 }: { items: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-surface-200 rounded-lg animate-pulse">
          <div className="w-16 h-16 bg-surface-300 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-300 rounded w-2/3" />
            <div className="h-3 bg-surface-300 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
