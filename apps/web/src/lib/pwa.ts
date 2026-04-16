'use client';

import React from 'react';

/**
 * PWA and Service Worker utilities
 */

export interface PWAState {
  isInstallable: boolean;
  isOnline: boolean;
  deferredPrompt: Event | null;
}

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker and handle offline functionality
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported in this browser');
    return null;
  }

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('Service Worker registered successfully', {
      scope: serviceWorkerRegistration.scope,
      updateViaCache: 'none',
    });

    // Listen for service worker updates
    serviceWorkerRegistration.addEventListener('updatefound', () => {
      const newWorker = serviceWorkerRegistration?.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is ready
            console.log('Service Worker update available');
            // Notify user about update
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('sw-update', {
                  detail: { registration: serviceWorkerRegistration },
                }),
              );
            }
          }
        });
      }
    });

    return serviceWorkerRegistration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!serviceWorkerRegistration) return;

  try {
    await serviceWorkerRegistration.unregister();
    serviceWorkerRegistration = null;
    console.log('Service Worker unregistered');
  } catch (error) {
    console.error('Failed to unregister Service Worker:', error);
  }
}

/**
 * Check if the app is installable as a PWA
 */
export function useInstallPrompt(onInstallPrompt?: (event: Event) => void): {
  isInstallable: boolean;
  install: () => Promise<void>;
} {
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      // Update app state to show install button
      if (onInstallPrompt) {
        onInstallPrompt(event);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [onInstallPrompt]);

  return {
    isInstallable: true,
    install: async () => {
      // Implementation would go here
    },
  };
}

/**
 * Monitor online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!serviceWorkerRegistration) return false;

  try {
    await serviceWorkerRegistration.update();
    return true;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return false;
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToServiceWorker(message: unknown): Promise<unknown> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) {
    throw new Error('Service Worker not available');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('All caches cleared');

    // Also clear IndexedDB if needed
    if ('indexedDB' in window) {
      const idb = window.indexedDB;
      const databases = await ((idb as IDBFactory & { databases?: () => Promise<Array<{ name: string }>> }).databases?.() as Promise<Array<{ name: string }>>).catch(
        () => [],
      );
      if (databases && databases.length > 0) {
        databases.forEach((dbInfo) => {
          idb.deleteDatabase(dbInfo.name);
        });
      }
    }
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Get service worker registration
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return serviceWorkerRegistration;
}

/**
 * Initialize PWA features
 */
export async function initializePWA(): Promise<void> {
  // Register service worker
  await registerServiceWorker();

  // Listen for sw updates
  if (typeof window !== 'undefined') {
    window.addEventListener('sw-update', () => {
      console.log('Service Worker has an update');
    });
  }

  // Log PWA capability
  console.log('PWA initialized', {
    serviceWorkerAvailable: 'serviceWorker' in navigator,
    manifestAvailable: !!document.querySelector('link[rel="manifest"]'),
  });
}

