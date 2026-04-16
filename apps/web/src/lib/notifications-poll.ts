import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook for polling unread notification count
 * Polls the notifications endpoint every 30 seconds (configurable)
 * Returns the unread notification count
 *
 * Usage:
 * ```tsx
 * const unreadCount = useUnreadCount();
 * return <NotificationBell badge={unreadCount} />;
 * ```
 */
export function useUnreadCount(pollInterval = 30000) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const fetchUnreadCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/v1/notifications?unread=true', {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      const data = await response.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      // Don't set error if the request was aborted
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching unread count:', err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Set up polling interval
  useEffect(() => {
    pollIntervalRef.current = setInterval(fetchUnreadCount, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Abort any pending request when component unmounts
      abortControllerRef.current?.abort();
    };
  }, [fetchUnreadCount, pollInterval]);

  // Manual refetch function (e.g., after marking as read)
  const refetch = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for real-time notifications with polling fallback
 * Attempts WebSocket connection, falls back to polling if unavailable
 */
export function useNotifications(pollInterval = 30000) {
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/v1/notifications', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Try WebSocket connection first
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for notifications');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications((prev) => [data, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        // Fall back to polling
        startPolling();
      };

      ws.onclose = () => {
        console.log('WebSocket closed, falling back to polling');
        setIsConnected(false);
        startPolling();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket:', error);
      startPolling();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(fetchNotifications, pollInterval);
  }, [fetchNotifications, pollInterval]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isConnected,
    refetch: fetchNotifications,
  };
}

/**
 * Hook to mark a notification as read
 */
export function useMarkAsRead() {
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch(`/v1/notifications/${notificationId}/read`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }

        return await response.json();
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
    []
  );

  return markAsRead;
}
