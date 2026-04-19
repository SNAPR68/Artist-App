// Firebase Cloud Messaging Service Worker
// Stub: push notifications are optional. This file prevents 404 errors.
// Replace with full implementation when FCM is configured.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Only initialize if config is injected via postMessage or meta tags
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && event.data.config) {
    try {
      firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const { title = 'GRID', body = '' } = payload.notification ?? {};
        self.registration.showNotification(title, { body, icon: '/icons/icon-192x192.png' });
      });
    } catch {
      // Already initialized or config invalid — safe to ignore
    }
  }
});
