'use client';

import { useEffect, useRef, useCallback, ReactNode, useState } from 'react';
import { SpinnerLoader } from './SkeletonLoaders';

interface InfiniteScrollProps {
  children: ReactNode;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void | Promise<void>;
  threshold?: number;
  fallback?: ReactNode;
}

/**
 * Infinite scroll component using IntersectionObserver
 * Automatically loads more content when user scrolls near the bottom
 *
 * Usage:
 * ```tsx
 * <InfiniteScroll
 *   hasMore={hasMore}
 *   isLoading={isLoading}
 *   onLoadMore={() => loadMoreItems()}
 * >
 *   {items.map(item => <ItemCard key={item.id} item={item} />)}
 * </InfiniteScroll>
 * ```
 */
export function InfiniteScroll({
  children,
  isLoading,
  hasMore,
  onLoadMore,
  threshold = 0.5,
  fallback,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, threshold]);

  return (
    <div className="space-y-4">
      {children}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          {fallback || <SpinnerLoader size="md" />}
        </div>
      )}

      {/* End of list message */}
      {!hasMore && !isLoading && (
        <div className="text-center py-8">
          <p className="text-nocturne-text-secondary">You&apos;ve reached the end</p>
        </div>
      )}

      {/* Observer target - placed at bottom of list */}
      {hasMore && <div ref={observerTarget} className="h-8" aria-label="Load more trigger" />}
    </div>
  );
}

/**
 * Hook for managing infinite scroll state
 */
export function useInfiniteScroll<T>({
  fetchFn,
  pageSize = 20,
}: {
  fetchFn: (page: number) => Promise<T[]>;
  pageSize?: number;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const newItems = await fetchFn(page);
      if (newItems.length < pageSize) {
        setHasMore(false);
      }
      setItems((prev: T[]) => [...prev, ...newItems]);
      setPage((prev: number) => prev + 1);
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, fetchFn, pageSize]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    reset,
  };
}
