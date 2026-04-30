'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function DemoViewTracker({ eventFileId, eventName }: { eventFileId: string; eventName: string }) {
  useEffect(() => {
    analytics.init();
    analytics.trackEvent('demo_event_file_viewed', {
      event_file_id: eventFileId,
      event_name: eventName,
    });
  }, [eventFileId, eventName]);
  return null;
}

export function DemoDownloadLink({
  href,
  eventFileId,
  kind,
  format,
  className,
  style,
  children,
  target,
  rel,
}: {
  href: string;
  eventFileId: string;
  kind: 'call-sheet' | 'consolidated-rider' | 'boq';
  format: 'pdf' | 'xlsx';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  const handleClick = () => {
    analytics.init();
    analytics.trackEvent('demo_download_clicked', {
      event_file_id: eventFileId,
      kind,
      format,
    });
  };
  return (
    <a href={href} className={className} style={style} target={target} rel={rel} onClick={handleClick}>
      {children}
    </a>
  );
}
