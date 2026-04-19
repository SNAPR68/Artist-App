# Session Handoff — 2026-04-18 (Sprint 3)

## Sprint 3 Status: Agency OS — Razorpay Subs, Admin Analytics, Concierge

### ✅ Task 1 — Razorpay Subscriptions (DONE, lint clean)
- **Migration:** `packages/db/migrations/20260418000090_create_agency_subscriptions.ts`
  - Tables: `agency_subscriptions`, `subscription_invoices`, `subscription_events`
  - Unique partial idx on `subscription_events.razorpay_event_id` for webhook idempotency
- **Service:** `apps/api/src/modules/subscription/subscription.service.ts`
  - `PLAN_SPECS`: Pro ₹15,000/mo, Enterprise ₹50,000/mo
  - `ensureRazorpayPlan`, `createCheckout`, `cancel`, `handleWebhook`, `upgradeWorkspace`, `downgradeWorkspace`
- **Routes:** `apps/api/src/modules/subscription/subscription.routes.ts`
  - `GET /v1/subscription/status|plans|invoices`
  - `POST /v1/subscription/activate-trial|checkout|cancel|webhook`
- **Razorpay client extended:** `createPlan`, `createCustomer`, `createSubscription`, `fetchSubscription`, `cancelSubscription` (all mock-mode safe via `razorpay as unknown as {...}` cast)
- **Billing UI:** `apps/web/src/app/(dashboard)/event-company/billing/page.tsx`
  - 3 plan cards (Free / Pro purple / Enterprise gold)
  - Trial activation, Razorpay checkout modal, invoice history table

### ⚠️ Task 2 — Admin Analytics (CODE DONE, VERIFICATION PENDING)
- **Routes:** `apps/api/src/modules/admin/admin-analytics.routes.ts`
  - `GET /v1/admin/analytics/funnel` (preserved)
  - `GET /v1/admin/analytics/revenue` — MRR/ARR/by_plan/trials/churn_30d/scheduled_cancels
  - `GET /v1/admin/analytics/agencies?limit=&order=health_desc|health_asc|recent` — per-workspace health
- **Health formula:** `planScore(40/30/0) + min(30, briefs*3 + bookings*6) + min(15, members*3) + max(0, 15 - days_since_last)`
- **Page:** `apps/web/src/app/(dashboard)/admin/analytics/page.tsx`
  - MRR hero with ₹1.5L target progress bar
  - 5 stat cards (Pro, Enterprise, Revenue 30d, Churned 30d, Trials)
  - Activation funnel (users → workspaces → briefs → bookings)
  - Agencies table: search + plan dropdown filter, HealthBar (green≥70 / gold≥40 / rose<40)
- **TODO next session:**
  - [ ] `pnpm lint --filter=@artist-booking/api --filter=@artist-booking/web` — catch anything in new files
  - [ ] Add `/admin/analytics` link to admin sidebar nav
  - [ ] Verify admin routes plugin registers `adminAnalyticsRoutes` in `apps/api/src/app.ts`

### ⬜ Task 3 — Concierge Upgrade (NOT STARTED)
White-glove onboarding + support queue for Pro/Enterprise agencies.
- **Suggested scope:**
  - Migration: `concierge_requests` (workspace_id, type [onboarding|support|escalation], priority, status, assigned_to_user_id, sla_due_at, description, resolved_at)
  - Auto-create onboarding request when `subscription.activated` webhook fires (hook into `subscriptionService.upgradeWorkspace`)
  - Admin queue at `/admin/concierge` with assign/resolve actions
  - Agency-side status widget on billing page showing open requests
  - Notification template: "Your dedicated concierge is {name}"

## Deploy Checklist

### Migrations (apply on Supabase)
```bash
cd packages/db && pnpm migrate
```
Applies `20260418000090_create_agency_subscriptions.ts`.
If migrate CLI can't reach DB, paste SQL into Supabase SQL Editor.

### Env vars (Render API)
```
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
RAZORPAY_PLAN_ID_PRO=plan_xxx           # create in Razorpay Dashboard
RAZORPAY_PLAN_ID_ENTERPRISE=plan_xxx    # create in Razorpay Dashboard
RAZORPAY_MOCK_MODE=false
```
Without `RAZORPAY_PLAN_ID_*` the service lazy-creates plans — fine for dev, risky for prod.

### Razorpay Dashboard
- Register webhook URL: `https://artist-booking-api.onrender.com/v1/subscription/webhook`
- Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.expired`, `subscription.pending`, `subscription.paused`
- Secret = `RAZORPAY_WEBHOOK_SECRET`
- Existing `/v1/payments/webhook` stays for `payment.*` events (dual webhooks)

## Architecture Notes
- Workspace plan stored in `workspaces.metadata` JSONB (`plan`, `trial_ends_at`, `razorpay_subscription_id`, `trial_used`)
- All money in **paise** in DB — convert to ₹ only at UI/CSV boundary
- Webhook idempotency: dedupe by `razorpay_event_id` before mutation (unique partial idx)
- `cancel_at_cycle_end=true` keeps status `active` until cycle ends; webhook flips to `cancelled` + triggers downgrade
- Trial: 14 days, `metadata.trial_used=true` prevents re-use
- Health score falls back gracefully if `workspace_activity` table absent (`.catch(() => [])`)
- Untyped Razorpay SDK methods wrapped with `(razorpay as unknown as {...}).method(...)` casts

## Known Gaps
- No prorated upgrades (Pro → Enterprise mid-cycle)
- No dunning emails on failed payment (Razorpay retries, but no user-facing notification)
- GST invoice generation is booking-only, not tied to subscription charges
- Admin analytics has no date-range filter (hard-coded 30d / 7d windows)
- Agencies table capped at 200 rows, no pagination

## Files Touched This Sprint
```
packages/db/migrations/20260418000090_create_agency_subscriptions.ts    NEW
apps/api/src/modules/payment/razorpay.client.ts                         EDIT (5 new methods)
apps/api/src/modules/subscription/subscription.service.ts               NEW
apps/api/src/modules/subscription/subscription.routes.ts                REWRITE
apps/api/src/modules/admin/admin-analytics.routes.ts                    REWRITE
apps/web/src/app/(dashboard)/event-company/billing/page.tsx             NEW
apps/web/src/app/(dashboard)/admin/analytics/page.tsx                   NEW
apps/api/src/modules/gst-invoice/gst-invoice.routes.ts                  LINT FIX line 163 (`[/\\]` escape)
```

## Next Session — Start Here
1. `pnpm --filter @artist-booking/api lint && pnpm --filter @artist-booking/web lint`
2. Fix any findings in `admin-analytics.routes.ts` / `admin/analytics/page.tsx`
3. Add nav link to `/admin/analytics` in admin sidebar component
4. Verify `subscriptionRoutes` + `adminAnalyticsRoutes` are both registered in `app.ts`
5. Kick off Task 3 (Concierge) — design `concierge_requests` table first, then webhook hook, then admin queue UI
6. Smoke test full Razorpay flow in mock mode before flipping `RAZORPAY_MOCK_MODE=false`

## 90-Day Plan Progress
- Sprint 1 ✅ (homepage pivot, /agency/join, dashboard Kanban, /pricing)
- Sprint 2 ✅ (deal vault, team collab, proposal templates, GST invoices)
- Sprint 3 🚧 (2/3 tasks code-complete, 1 pending)
- Target: 10 paying agencies × ₹15K/mo = ₹1.5L MRR
