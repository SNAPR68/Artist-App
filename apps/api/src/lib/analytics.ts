// Lightweight server-side PostHog event capture. DSN-gated — no-op if unset.
// Uses fetch to /capture/ to avoid adding posthog-node as a dep mid-sprint.
// Fire-and-forget: never blocks the request, swallows errors to logger.

const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
const apiKey = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_ANALYTICS_API_KEY;

export const ANALYTICS_EVENTS = {
  EVENT_FILE_CREATED: 'event_file_created',
  VENDOR_ATTACHED_TO_EVENT_FILE: 'vendor_attached_to_event_file',
  CALL_SHEET_GENERATED: 'call_sheet_generated',
  CONSOLIDATED_RIDER_GENERATED: 'consolidated_rider_generated',
  BOQ_GENERATED: 'boq_generated',
  DEMO_EVENT_FILE_VIEWED: 'demo_event_file_viewed',
  DEMO_DOWNLOAD_CLICKED: 'demo_download_clicked',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export function trackServerEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties: Record<string, unknown> = {},
): void {
  if (!apiKey) return;
  const body = JSON.stringify({
    api_key: apiKey,
    event,
    distinct_id: distinctId,
    properties: { ...properties, $lib: 'grid-api' },
    timestamp: new Date().toISOString(),
  });
  void fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  }).catch(() => {
    // swallow — analytics must never break the request
  });
}
