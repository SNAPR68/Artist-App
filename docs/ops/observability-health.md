# Observability Health — Sentry + PostHog

_Last checked: 2026-04-22_

## Status Summary

| Service | Surface | Status | Evidence |
|---------|---------|--------|----------|
| Sentry  | API (Render)      | Wired (code), DSN gated | `apps/api/src/plugins/sentry.ts`, `apps/api/src/app.ts:143` — plugin only registers when `config.SENTRY_DSN` is set |
| Sentry  | Web (Vercel)      | Not integrated | No client-side Sentry SDK present — errors land in Vercel Function logs only |
| PostHog | Web (Vercel)      | LIVE in prod | Project key `phc_fUuQTCOPouiN58JAl0tu7PIH1djEcbeRQzMXhUWNLFK` inlined in `/_next/static/chunks/app/layout-*.js`. `AnalyticsProvider` mounted in root `layout.tsx` → fires on every page. `api_host: https://us.i.posthog.com` |

## Liveness checks (2026-04-22)
- `GET https://artist-booking-api.onrender.com/health` → `200 {status:ok, database:ok, redis:ok}`
- `GET https://artist-booking-web.vercel.app/` → `200`

## Sentry — API

### Wiring (verified)
- `apps/api/src/plugins/sentry.ts`: dynamic require of `@sentry/node` (graceful no-op if missing).
- Captures: `captureException` helper + automatic 5xx → `captureMessage` via `onResponse` hook.
- Request context: `request_id`, method, url, ip, authenticated user id/phone.

### To verify in production
1. In Render dashboard → `artist-booking-api` → Environment → confirm `SENTRY_DSN` is set.
2. On API startup, log line `"Sentry error tracking initialized"` should appear. If you see `"Sentry DSN not provided, error tracking disabled"` or `"@sentry/node not installed…"` the DSN is missing or the package wasn't installed.
3. Force a 5xx (e.g. temporarily throw in a rarely used endpoint, deploy, hit it, revert) and confirm the event appears in Sentry → project → Issues.

### Gap
- **Web has no Sentry SDK**. Client-side runtime errors in Next.js pages are not captured. For pilot we rely on Vercel function logs + PostHog error events. Adding `@sentry/nextjs` is a Sprint D polish item, not MVP-blocking.

## PostHog — Web

### Wiring (verified)
- `apps/web/src/lib/analytics.ts` init with `capture_pageview: true`, `capture_pageleave: true`, `autocapture: true`.
- `apps/web/src/components/AnalyticsProvider.tsx` calls `analytics.init()` in `useEffect`.
- Root `layout.tsx` mounts `<AnalyticsProvider />` → runs on every route.

### Evidence PostHog key is deployed
`phc_fUuQTCOPouiN58JAl0tu7PIH1djEcbeRQzMXhUWNLFK` appears in production bundle `https://artist-booking-web.vercel.app/_next/static/chunks/app/layout-*.js`. This is the public project key (safe to expose — PostHog public keys only allow ingestion, not reads).

### To verify in production
1. Open https://artist-booking-web.vercel.app in a fresh incognito window.
2. DevTools → Network → filter `posthog` or `i.posthog.com` → confirm a `POST /i/v0/e/?...` request with `200` response.
3. In PostHog dashboard (us.i.posthog.com) → Live Events → your pageview should appear within ~5s.

### What's being captured
- Every pageview (`$pageview` via `capture_pageview`)
- Pageleaves with time-on-page (`capture_pageleave`)
- Autocapture: clicks, form submits, rage clicks on `<button>`, `<a>`, inputs
- Custom events via `analytics.trackEvent(name, props)` — used sparingly (not yet instrumented on Event File flows — Sprint C polish)

## Recommended next actions (post-pilot, not blocking)
1. Add `@sentry/nextjs` wrapper to capture client-side JS errors on Web.
2. Instrument Event File flows with named events: `event_file_created`, `call_sheet_generated`, `day_of_call_dispatched` — so we can build a PostHog funnel for pilot agencies.
3. Set Sentry `environment: 'production'` + `release` tag per deploy (currently defaults to `development` if env unset).
4. Wire a Sentry alert rule: any issue with `count > 10 in 1h` → Slack webhook.
