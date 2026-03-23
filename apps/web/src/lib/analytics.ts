'use client';

import posthog from 'posthog-js';

let initialized = false;

function initPostHog() {
  if (initialized || typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_ANALYTICS_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) return;

  posthog.init(apiKey, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    loaded: () => {
      initialized = true;
    },
  });
}

export const analytics = {
  init: initPostHog,

  trackPageView(pageName: string, properties?: Record<string, any>) {
    if (!initialized) return;
    posthog.capture('$pageview', { page_name: pageName, ...properties });
  },

  identifyUser(userId: string, properties?: Record<string, any>) {
    if (!initialized) return;
    posthog.identify(userId, properties);
  },

  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!initialized) return;
    posthog.capture(eventName, properties);
  },

  setUserProperties(properties: Record<string, any>) {
    if (!initialized) return;
    posthog.setPersonProperties(properties);
  },

  reset() {
    if (!initialized) return;
    posthog.reset();
  },

  /**
   * Check if a feature flag is enabled for the current user.
   * Returns false if PostHog is not initialized or the flag doesn't exist.
   */
  isFeatureEnabled(flagName: string): boolean {
    if (!initialized) return false;
    return posthog.isFeatureEnabled(flagName) ?? false;
  },

  /**
   * Get the value of a feature flag (for multivariate flags).
   * Returns undefined if PostHog is not initialized.
   */
  getFeatureFlag(flagName: string): string | boolean | undefined {
    if (!initialized) return undefined;
    return posthog.getFeatureFlag(flagName) ?? undefined;
  },

  /**
   * Reload feature flags from PostHog (e.g., after user identification).
   */
  reloadFeatureFlags() {
    if (!initialized) return;
    posthog.reloadFeatureFlags();
  },
};
