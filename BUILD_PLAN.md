# Complete Build Plan: 35 → 100

_Artist Booking Platform — March 21, 2026_

## Summary

| Metric | Value |
|--------|-------|
| Total Sprints | 20 across 8 phases |
| Frontend Pages to Build | 35 skeleton → functional |
| Backend Endpoints | 237 (all built, need validation fixes) |
| Security Issues | 11 (2 critical, 3 high, 6 medium) |
| Timeline | ~14 weeks (1 full-time dev) |
| Backend Status | COMPLETE — needs hardening |
| Frontend Status | 12/49 pages working |

---

## Phase 1: Security Foundation (Sprints 1-2)

### Sprint 1: Server-Side Auth — ✅ DONE
- [x] Create middleware.ts with JWT route protection (Edge middleware reads auth_token cookie)
- [x] Mirror JWT into cookie for middleware access (SameSite=Lax signal cookie)
- [x] Role-based route gating (artist/client/agent/admin isolation)
- [x] Login redirect with ?redirect= param (preserves original URL)
- [x] CSP headers in next.config.js
- [x] Security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff)
- [x] DashboardLayout auth guard with loading skeleton
- [x] Wrap login page in Suspense for useSearchParams

### Sprint 2: Auth UX Polish
- [ ] Session expiry modal (dialog instead of silent redirect)
- [ ] Seamless token refresh edge cases (retry queue for concurrent 401s)
- [ ] Auth loading skeleton in root layout (prevent white flash)
- [ ] Logout clears cookie + redirects to /

---

## Phase 2: Backend Hardening (Sprints 3-4)

### Sprint 3: Critical Security Fixes — BLOCKING FOR LAUNCH
- [ ] Remove OTP test bypass (123456) → `apps/api/src/modules/auth/otp.service.ts` line 57-63
- [ ] Add auth to POST /v1/admin/setup-demo-users → `admin.routes.ts` line 14
- [ ] Add auth to POST /v1/admin/fix-seed-hashes → `admin.routes.ts` line 156
- [ ] Stop logging PII in notification service → `notification.service.ts` line 97
- [ ] Stop logging OTP in SMS bypass → `sms.service.ts` line 22
- [ ] Stop logging PII in Razorpay mock → `razorpay.client.ts`
- [ ] Add configurable OTP bypass flag (ENV var ALLOW_TEST_OTP=true only in dev)
- [ ] Add Razorpay webhook IP validation → `payment.routes.ts` webhook handler

### Sprint 4: API Validation & Hardening
- [ ] Add Zod schemas to payment routes (5 routes) → `payment.routes.ts`
  - POST /v1/payments/orders
  - POST /v1/payments/verify
  - POST /v1/payments/settle/:paymentId
  - POST /v1/payments/settle-eligible
  - POST /v1/payments/webhook
- [ ] Add Zod schema to client PUT → `client.routes.ts` line 54
- [ ] Add Zod schema to review POST → `review.routes.ts` line 8
- [ ] Add Zod schemas to concierge routes (2) → `concierge.routes.ts`
- [ ] Add Zod schemas to shortlist routes (2) → `shortlist.routes.ts`
- [ ] Add Zod schema to notification prefs PUT → `notification.routes.ts`
- [ ] Fix rate limiter fail-open behavior → `rate-limiter.middleware.ts` (return 429 if Redis unreachable)
- [ ] Add payment idempotency for refunds → `payment.service.ts`
- [ ] Atomic booking state + payment updates (DB transaction) → `payment.service.ts`
- [ ] Add HSTS header to API → `app.ts` helmet config

---

## Phase 3: Core Booking Flow (Sprints 5-7) — THE MONEY PATH

### Sprint 5: Booking Creation & Detail Pages (4-5 days, 2 pages)
- [ ] Polish BookingInquiryForm on /artists/[id] → `POST /v1/bookings` (date picker, event type, venue, budget)
- [ ] Build /client/bookings/[id] — full booking detail → `GET /v1/bookings/:id`
  - State timeline (12 states), quote breakdown, artist card, action buttons
- [ ] Booking state action buttons → `POST /v1/bookings/:id/transition`
- [ ] Build /artist/bookings/[id] — artist-side detail → `GET /v1/bookings/:id`
  - Submit quote, accept/decline, mark arrived/complete
- [ ] Quote submission form for artists → `POST /v1/bookings/:id/quotes`
- [ ] Auto-quote generation → `GET /v1/bookings/:id/auto-quote`
- [ ] Contract view/download → `GET /v1/bookings/:id/contract`

### Sprint 6: Payment Flow — Razorpay (3-4 days, 1 page)
- [ ] Build /client/bookings/[id]/pay → `POST /v1/payments/orders` (load Razorpay checkout.js)
- [ ] Payment verification → `POST /v1/payments/verify` (signature check)
- [ ] Payment failure handling + retry
- [ ] Payment confirmation page + invoice → `GET /v1/payments/invoice/:id`
- [ ] Payment history (client view) → `GET /v1/payments/history`
- [ ] Invoice PDF download → `GET /v1/payments/invoice/:id/pdf`
- [ ] Contract PDF download → `GET /v1/payments/contract/:bookingId/pdf`

### Sprint 7: Reviews & Post-Booking (2-3 days)
- [ ] Review submission form (5 dimensions) → `POST /v1/reviews`
  - Punctuality, professionalism, crowd engagement, sound quality, value
- [ ] Artist review response → `GET /v1/reviews/booking/:id`
- [ ] Show real reviews on /artists/[id] → `GET /v1/reviews/artist/:id`
- [ ] Cancellation flow with modal → `POST /v1/bookings/:id/cancel`
  - Sub-types: BY_CLIENT, BY_ARTIST, FORCE_MAJEURE, PLATFORM

---

## Phase 4: Dashboard Pages (Sprints 8-11) — 18 pages

### Sprint 8: Artist — Calendar, Financial, Earnings (4-5 days, 3 pages)
- [ ] /artist/calendar — availability calendar → `GET/PUT /v1/calendar`
  - Monthly grid, drag to set available/unavailable, show bookings
- [ ] /artist/financial — Financial Command Center → `GET /v1/payments/earnings`
  - Earnings summary (total, pending, settled), tax estimate
- [ ] Bank account management → `POST/GET/PUT/DELETE /v1/artists/bank-account`
- [ ] /artist/earnings — payment history detail → `GET /v1/payments/history`
- [ ] Payout history → `GET /v1/artists/payouts`

### Sprint 9: Artist Intelligence Suite (3-4 days, 4 pages)
- [ ] /artist/intelligence/reputation — Trust Score → Reputation Defense API
- [ ] /artist/intelligence/gig-advisor — Gig Recs → `GET /v1/gigs/matching`
- [ ] /artist/gamification — Achievements & badges → Gamification API
- [ ] /artist/seasonal — Demand trends → Seasonal Demand API

### Sprint 10: Client Dashboard Complete (4-5 days, 4 pages)
- [ ] /client/shortlists → `POST/GET/DELETE /v1/shortlists` + `/shortlists/:id/artists`
- [ ] /client/recommendations → Recommendation API (Jaccard similarity)
- [ ] /client/substitutions → Emergency Substitution API
- [ ] /client/onboarding → `POST /v1/clients/profile`

### Sprint 11: Event Company Workspace (5-6 days, 5 pages)
- [ ] /client/workspace/[id] — dashboard → `GET /v1/workspaces/:id` + pipeline + events
  - Team members, booking pipeline kanban, events list
- [ ] Team management → `POST/GET/PUT/DELETE /v1/workspaces/:id/members`
- [ ] Event CRUD + booking linking → `POST/GET/PUT /v1/workspaces/:id/events`
- [ ] /client/workspace/[id]/analytics → `GET /v1/workspaces/:id/analytics`
- [ ] /client/workspace/[id]/commission → `GET/PUT /v1/workspaces/:id/commission`
- [ ] /client/workspace/[id]/presentations → `POST/GET /v1/workspaces/:id/presentations`
- [ ] /client/workspace/[id]/settings → `PUT /v1/workspaces/:id`

---

## Phase 5: Agent & Admin (Sprints 12-13)

### Sprint 12: Agent Dashboard (3-4 days, 4 pages)
- [ ] /agent/roster → `GET/POST/DELETE /v1/agents/roster`
- [ ] Roster performance → `GET /v1/agents/roster/performance`
- [ ] /agent/bookings → `GET /v1/bookings` (agent filter)
- [ ] Concierge booking → `POST /v1/concierge/book`
- [ ] /agent/onboarding → `POST /v1/agents/profile`
- [ ] Commission dashboard → `GET /v1/agents/commissions` + `/commissions/history`

### Sprint 13: Admin Dashboard Polish (4-5 days, 1 multi-tab page)
- [ ] User management tab → `GET /v1/admin/users` + verify/suspend
- [ ] Booking management tab → `GET /v1/bookings` + force transition
- [ ] Payment management tab → `GET /v1/admin/payments` + settle
- [ ] Dispute resolution tab → Dispute API
- [ ] Platform analytics charts → `GET /v1/admin/stats`
- [ ] Venue management tab → Venue API

---

## Phase 6: Support Pages (Sprint 14)

### Sprint 14: Notifications, Settings, Legal, Voice (4-5 days, 7 pages)
- [ ] /notifications → `GET /v1/notifications` + `PUT .../read` + `.../read-all`
- [ ] Notification preferences → `GET/PUT /v1/notifications/preferences`
- [ ] /settings — user settings (profile, prefs, language, delete account)
- [ ] /gigs/[id] — gig detail → `GET /v1/gigs/:id` + `POST .../apply`
- [ ] Gig application management → `GET .../applications` + `PUT .../respond`
- [ ] /voice — standalone voice page → `GET /v1/voice/sessions`
- [ ] /privacy + /terms — real legal text
- [ ] /artist/onboarding/social → Social Analyzer API

---

## Phase 7: Infrastructure & Integration (Sprints 15-17)

### Sprint 15: Monitoring & Error Tracking (3-4 days)
- [ ] Add Sentry to Fastify API (`@sentry/node` + Fastify plugin)
- [ ] Add Sentry release tracking (source map upload on deploy)
- [ ] Replace console.error with Sentry.captureException across all modules
- [ ] Add analytics (PostHog or Mixpanel) to frontend
- [ ] Add health check endpoint → `GET /v1/health`
- [ ] Request body PII filtering in logs → `request-logger.middleware.ts`

### Sprint 16: Real Integration Providers (4-5 days) — REQUIRED FOR REAL USERS
- [ ] Connect Razorpay test mode end-to-end (set RAZORPAY_KEY_ID + SECRET)
- [ ] Connect Resend email provider (set RESEND_API_KEY)
- [ ] Connect MSG91 SMS provider (set MSG91_AUTH_KEY)
- [ ] Configure Firebase push notifications (set FIREBASE_PROJECT_ID + key)
- [ ] Test WhatsApp via Gupshup (set GUPSHUP_* env vars)
- [ ] Add notification delivery status tracking (send/delivered/failed)
- [ ] Add retry logic for failed notifications (exponential backoff)

### Sprint 17: Infrastructure Upgrades (3-4 days)
- [ ] Upgrade Render from free to paid ($7/month) — eliminates cold starts
- [ ] Set up staging environment on Vercel (preview deployments)
- [ ] Fix Docker credentials (use .env file, not hardcoded)
- [ ] Enable OpenSearch security (docker-compose.yml line 42)
- [ ] Add CI security scanning (npm audit on PR)
- [ ] Add CI secret detection
- [ ] PII encryption key rotation plan (documentation)
- [ ] PWA setup (manifest.json, service worker, offline page)

---

## Phase 8: Launch Preparation (Sprints 18-20)

### Sprint 18: Performance & Polish (4-5 days)
- [ ] Replace all `<img>` with `next/image`
- [ ] Add Suspense boundaries + loading.tsx for every route group
- [ ] Error boundaries per route group
- [ ] Skeleton loaders on every data-fetching page
- [ ] Infinite scroll / virtual lists (bookings, notifications, history)
- [ ] Bundle analysis + code splitting (dynamic imports)
- [ ] Lighthouse audit → target 90+ performance, 100 accessibility
- [ ] Real-time polling for notifications (30s interval, unread badge)

### Sprint 19: End-to-End Testing (5-6 days)
- [ ] Playwright: Login → Search → Book → Pay → Review
- [ ] Playwright: Artist onboarding → profile → calendar
- [ ] Playwright: EC workspace → event → presentation
- [ ] Playwright: Admin user management
- [ ] API integration tests for payment (Razorpay test mode)
- [ ] API tests for booking state machine (all 12 states)
- [ ] Load testing — concurrent bookings (k6 or artillery)
- [ ] Security penetration testing (OWASP ZAP or manual)

### Sprint 20: Go-Live (3-4 days)
- [ ] Seed production data (real artists, verified content)
- [ ] Remove/disable test OTP bypass (ENV flag only in staging)
- [ ] Final security review (verify all 11 findings resolved)
- [ ] Set up monitoring dashboards (Sentry + analytics)
- [ ] Configure alerting (payment failures, high error rates)
- [ ] DNS / custom domain setup
- [ ] Rollback procedure documented
- [ ] Go-live checklist execution (smoke test, monitor first 24h)

---

## Security Findings (11 issues)

| # | Issue | File | Severity | Sprint |
|---|-------|------|----------|--------|
| 1 | OTP bypass (123456 always works) | auth/otp.service.ts:57 | CRITICAL | 3 |
| 2 | Unauthenticated admin endpoints | admin/admin.routes.ts | CRITICAL | 3 |
| 3 | Payment routes unvalidated (5 routes) | payment/payment.routes.ts | HIGH | 4 |
| 4 | PII logged in notifications | notification.service.ts:97 | HIGH | 3 |
| 5 | OTP logged in SMS bypass | auth/sms.service.ts:22 | HIGH | 3 |
| 6 | Client PUT unvalidated | client/client.routes.ts:54 | MEDIUM | 4 |
| 7 | Review POST unvalidated | review/review.routes.ts:8 | MEDIUM | 4 |
| 8 | Concierge routes unvalidated | concierge/concierge.routes.ts | MEDIUM | 4 |
| 9 | Shortlist routes unvalidated | shortlist/shortlist.routes.ts | LOW | 4 |
| 10 | No Sentry on API server | apps/api/ (missing) | MEDIUM | 15 |
| 11 | Rate limiter fails open | rate-limiter.middleware.ts | MEDIUM | 4 |

---

## Key API Endpoints Reference

### Auth
- `POST /v1/auth/otp/generate` — Send OTP (no auth)
- `POST /v1/auth/otp/verify` — Verify OTP, get tokens (no auth)
- `POST /v1/auth/token/refresh` — Refresh access token (no auth)
- `POST /v1/auth/logout` — Revoke tokens

### Booking
- `POST /v1/bookings` — Create inquiry
- `GET /v1/bookings` — List (filter by status/role)
- `GET /v1/bookings/:id` — Detail
- `POST /v1/bookings/:id/transition` — State transition
- `POST /v1/bookings/:id/cancel` — Cancel
- `POST /v1/bookings/:id/quotes` — Submit quote
- `GET /v1/bookings/:id/auto-quote` — Auto-quote
- `GET /v1/bookings/:id/contract` — Contract HTML

### Payment
- `POST /v1/payments/orders` — Create Razorpay order
- `POST /v1/payments/verify` — Verify signature
- `GET /v1/payments/history` — Payment history
- `GET /v1/payments/earnings` — Artist earnings
- `GET /v1/payments/invoice/:id/pdf` — Invoice PDF
- `GET /v1/payments/contract/:bookingId/pdf` — Contract PDF
- `GET /v1/artists/payouts` — Payout history

### Workspace
- `POST /v1/workspaces` — Create
- `GET /v1/workspaces/:id` — Details
- `POST /v1/workspaces/:id/members` — Invite
- `GET /v1/workspaces/:id/pipeline` — Booking pipeline
- `POST /v1/workspaces/:id/events` — Create event
- `POST /v1/workspaces/:id/presentations` — Generate presentation
- `GET /v1/workspaces/:id/analytics` — Analytics
- `GET /v1/workspaces/:id/commission` — Commission

### Other Key Endpoints
- `GET /v1/search/artists` — Search (no auth, rate limited)
- `GET /v1/artists/:id` — Public profile (no auth)
- `GET/PUT /v1/calendar` — Availability
- `POST /v1/reviews` — Submit review
- `GET /v1/notifications` — List notifications
- `GET /v1/gigs` — List gigs
- `POST /v1/gigs/:id/apply` — Apply to gig
- `GET /v1/admin/stats` — Platform stats (admin)

---

## Seed Data

| Phone | Name | Role | OTP |
|-------|------|------|-----|
| 9876543210 | DJ Arjun | artist | 123456 |
| 9876543218 | The Wedding Band | artist | 123456 |
| 9876543211 | Shreya Acoustic | artist | 123456 |
| 9876543215 | EC User 1 | event_company | 123456 |
| 9876543216 | EC User 2 | event_company | 123456 |

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://artist-booking-web.vercel.app |
| API | Render (free) | https://artist-booking-api.onrender.com |
| Database | Supabase | wqfzlkkkcsjrwksjpxfp.supabase.co |
| Repo | GitHub | SNAPR68/Artist-App (main branch) |

## Dev Commands

```bash
pnpm install
pnpm --filter @artist-booking/shared build   # Build shared FIRST
pnpm --filter @artist-booking/api dev         # API on :3001
pnpm --filter @artist-booking/web dev         # Frontend on :3000
pnpm turbo build --filter=@artist-booking/web # Production build
pnpm turbo test                               # Run tests
```
