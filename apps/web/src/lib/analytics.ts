'use client';

/**
 * Analytics wrapper for PostHog/Mixpanel.
 * Provides a unified interface for tracking pageviews, user identification, and custom events.
 */

interface AnalyticsConfig {
  provider: 'posthog' | 'mixpanel' | 'none';
  apiKey?: string;
}

class Analytics {
  private provider: 'posthog' | 'mixpanel' | 'none';
  private apiKey?: string;
  private userId?: string;
  private userProperties?: Record<string, any>;

  constructor(config: AnalyticsConfig) {
    this.provider = config.provider || 'none';
    this.apiKey = config.apiKey;

    if (this.provider === 'posthog' && this.apiKey) {
      this.initPostHog();
    } else if (this.provider === 'mixpanel' && this.apiKey) {
      this.initMixpanel();
    }
  }

  private initPostHog() {
    if (typeof window === 'undefined') return;

    try {
      // PostHog initialization
      if ((window as any).posthog) {
        (window as any).posthog.init(this.apiKey, {
          api_host: 'https://app.posthog.com',
        });
      }
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  private initMixpanel() {
    if (typeof window === 'undefined') return;

    try {
      // Mixpanel initialization
      if ((window as any).mixpanel) {
        (window as any).mixpanel.init(this.apiKey);
      }
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
    }
  }

  /**
   * Track a pageview event
   */
  trackPageView(pageName: string, properties?: Record<string, any>) {
    if (this.provider === 'none' || typeof window === 'undefined') return;

    try {
      if (this.provider === 'posthog' && (window as any).posthog) {
        (window as any).posthog.capture('$pageview', {
          page_name: pageName,
          ...properties,
        });
      } else if (this.provider === 'mixpanel' && (window as any).mixpanel) {
        (window as any).mixpanel.track('Page View', {
          page_name: pageName,
          ...properties,
        });
      }
    } catch (error) {
      console.error('Failed to track pageview:', error);
    }
  }

  /**
   * Identify a user and set their properties
   */
  identifyUser(userId: string, properties?: Record<string, any>) {
    if (this.provider === 'none' || typeof window === 'undefined') return;

    this.userId = userId;
    this.userProperties = properties;

    try {
      if (this.provider === 'posthog' && (window as any).posthog) {
        (window as any).posthog.identify(userId, properties);
      } else if (this.provider === 'mixpanel' && (window as any).mixpanel) {
        (window as any).mixpanel.identify(userId);
        if (properties) {
          (window as any).mixpanel.people.set(properties);
        }
      }
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (this.provider === 'none' || typeof window === 'undefined') return;

    try {
      if (this.provider === 'posthog' && (window as any).posthog) {
        (window as any).posthog.capture(eventName, properties);
      } else if (this.provider === 'mixpanel' && (window as any).mixpanel) {
        (window as any).mixpanel.track(eventName, properties);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>) {
    if (this.provider === 'none' || typeof window === 'undefined') return;

    this.userProperties = { ...this.userProperties, ...properties };

    try {
      if (this.provider === 'posthog' && (window as any).posthog) {
        (window as any).posthog.setPersonProperties(properties);
      } else if (this.provider === 'mixpanel' && (window as any).mixpanel) {
        (window as any).mixpanel.people.set(properties);
      }
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  /**
   * Track a page section view (custom event)
   */
  trackSection(sectionName: string, properties?: Record<string, any>) {
    this.trackEvent('Section View', {
      section: sectionName,
      ...properties,
    });
  }

  /**
   * Get current user ID
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  /**
   * Get current user properties
   */
  getUserProperties(): Record<string, any> | undefined {
    return this.userProperties;
  }
}

// Initialize analytics with environment configuration
const getAnalyticsConfig = (): AnalyticsConfig => {
  const provider = (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || 'none') as 'posthog' | 'mixpanel' | 'none';
  const apiKey = process.env.NEXT_PUBLIC_ANALYTICS_API_KEY;

  return {
    provider,
    apiKey,
  };
};

export const analytics = new Analytics(getAnalyticsConfig());
export type { Analytics };
