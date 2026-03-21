'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function AnalyticsProvider() {
  useEffect(() => {
    analytics.init();
  }, []);

  return null;
}
