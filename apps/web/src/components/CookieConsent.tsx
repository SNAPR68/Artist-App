'use client';

import { useState, useEffect } from 'react';
import posthog from 'posthog-js';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('cookie_consent', 'accepted');
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem('cookie_consent', 'declined');
      // Disable PostHog analytics if user declines
      posthog.opt_out_capturing();
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-nocturne-surface border-t border-nocturne-border p-4 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-nocturne-text-secondary text-center sm:text-left">
          We use cookies and analytics to improve your experience. By accepting, you agree to our use of cookies for analytics purposes.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-nocturne-text-secondary hover:text-nocturne-text-primary border border-nocturne-border rounded-lg hover:border-nocturne-border/80 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm text-nocturne-text-primary bg-nocturne-primary rounded-lg hover:bg-nocturne-primary-hover transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
