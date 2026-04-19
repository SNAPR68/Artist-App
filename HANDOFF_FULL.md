# GRID — Full Sprint 3 Handoff Document
_Generated: 2026-04-18_
_Context: Agency OS pivot, 90-day plan to ₹1.5L MRR (10 agencies × ₹15K/mo)_

---

## 0. PROJECT CONTEXT (read first)

**GRID** = rebranded ArtistBook. India's live entertainment Operating System.
Monorepo at `/Users/baba/ArtistAPP/artist-booking-platform/`.

**Stack:**
- Node 22, TypeScript 5.5, pnpm 9.15.4, Turborepo 2
- Backend: Fastify 5 + Knex 3.1 (ESM, `.js` imports in source)
- Frontend: Next.js 14 App Router + React 18 + Tailwind 3.4
- DB: Supabase (Sydney) via session pooler
- Deploy: Render (API), Vercel (web)

**Design system:** Nocturne Hollywood (dark, glassmorphism)
- bg `#0e0e0f`, surface `#1a1a1d`, purple `#c39bff`, cyan `#a1faff`, gold `#ffbf00`
- `glass-card`, `btn-nocturne-primary`, `badge-nocturne` utilities
- Font: Inter body, Manrope display

**90-day plan:**
- Sprint 1 ✅ homepage pivot, /agency/join, dashboard Kanban, /pricing
- Sprint 2 ✅ deal vault, team collab, proposal templates, GST invoices
- Sprint 3 🚧 Razorpay subscriptions, Admin analytics, Concierge upgrade

---

## 1. SPRINT 3 — WHAT MUST BE BUILT

Three tasks total. Task 1 and Task 2 are code-complete this session. Task 3 is untouched.

### Task 1 — Razorpay Subscriptions (for agency Pro/Enterprise plans)
**Goal:** let workspace admins self-serve upgrade from Free → Pro (₹15K/mo) or Enterprise (₹50K/mo) with recurring billing, 14-day trial, invoice history, cancel-at-cycle-end.

### Task 2 — Admin Analytics Dashboard
**Goal:** founder-facing dashboard at `/admin/analytics` showing MRR vs ₹1.5L target, activation funnel, per-agency health scores.

### Task 3 — Concierge Upgrade
**Goal:** white-glove onboarding + support queue for paying agencies. Auto-create onboarding ticket on subscription activation. Admin queue at `/admin/concierge`.

---

## 2. TASK 1 — RAZORPAY SUBSCRIPTIONS (COMPLETE)

### 2.1 Migration — `packages/db/migrations/20260418000090_create_agency_subscriptions.ts`

Creates three tables:

**`agency_subscriptions`**
```
id                          uuid pk
workspace_id                uuid fk workspaces.id
plan                        text check in ('pro','enterprise')
status                      text check in ('created','authenticated','active','pending','halted','cancelled','completed','expired','paused')
razorpay_plan_id            text
razorpay_customer_id        text nullable
razorpay_subscription_id    text unique nullable
amount_paise                bigint
currency                    text default 'INR'
total_count                 int nullable      -- 12 for yearly, null for indefinite
paid_count                  int default 0
remaining_count             int nullable
current_start               timestamptz nullable
current_end                 timestamptz nullable
charge_at                   timestamptz nullable
start_at                    timestamptz nullable
end_at                      timestamptz nullable
ended_at                    timestamptz nullable
cancel_at_cycle_end         boolean default false
notes                       jsonb default '{}'
created_by                  uuid fk users.id
created_at / updated_at     timestamptz
```

**`subscription_invoices`**
```
id                      uuid pk
subscription_id         uuid fk agency_subscriptions.id
workspace_id            uuid fk workspaces.id
razorpay_invoice_id     text unique nullable
razorpay_payment_id     text nullable
amount_paise            bigint
currency                text default 'INR'
status                  text  -- 'paid' | 'failed' | 'issued'
billing_start           timestamptz nullable
billing_end             timestamptz nullable
paid_at                 timestamptz nullable
invoice_pdf_url         text nullable
created_at              timestamptz
```

**`subscription_events`**
```
id                          uuid pk
subscription_id             uuid nullable fk agency_subscriptions.id
razorpay_subscription_id    text nullable
event                       text   -- 'subscription.activated' etc
razorpay_event_id           text nullable
payload                     jsonb
created_at                  timestamptz

CREATE UNIQUE INDEX uq_sub_events_event_id
  ON subscription_events(razorpay_event_id)
  WHERE razorpay_event_id IS NOT NULL;
```

Rollback: `dropTableIfExists` all three in reverse order.

### 2.2 Razorpay client — `apps/api/src/modules/payment/razorpay.client.ts`

Add these methods to the existing client. The Razorpay Node SDK types are incomplete for subscriptions — wrap with `as unknown as {...}`:

```ts
async createPlan(params: {
  period: 'monthly' | 'yearly';
  interval: number;
  item: { name: string; amount_paise: number; currency: string; description?: string };
  notes?: Record<string, string>;
}): Promise<{ id: string; [k: string]: unknown }> {
  if (this.isMock) return { id: `plan_mock_${Date.now()}` };
  return (this.razorpay as unknown as {
    plans: { create(body: unknown): Promise<{ id: string }> };
  }).plans.create({
    period: params.period,
    interval: params.interval,
    item: {
      name: params.item.name,
      amount: params.item.amount_paise,
      currency: params.item.currency,
      description: params.item.description,
    },
    notes: params.notes,
  });
}

async createCustomer(params: {
  name: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
}): Promise<{ id: string }> {
  if (this.isMock) return { id: `cust_mock_${Date.now()}` };
  return (this.razorpay as unknown as {
    customers: { create(body: unknown): Promise<{ id: string }> };
  }).customers.create({
    name: params.name,
    email: params.email,
    contact: params.contact,
    fail_existing: 0,
    notes: params.notes,
  });
}

async createSubscription(params: {
  plan_id: string;
  customer_id?: string;
  total_count?: number;
  quantity?: number;
  start_at?: number;
  notes?: Record<string, string>;
}): Promise<{ id: string; short_url?: string; status: string }> {
  if (this.isMock) {
    return {
      id: `sub_mock_${Date.now()}`,
      short_url: 'https://rzp.io/mock',
      status: 'created',
    };
  }
  return (this.razorpay as unknown as {
    subscriptions: { create(body: unknown): Promise<{ id: string; short_url?: string; status: string }> };
  }).subscriptions.create({
    plan_id: params.plan_id,
    customer_id: params.customer_id,
    total_count: params.total_count ?? 12,
    quantity: params.quantity ?? 1,
    start_at: params.start_at,
    customer_notify: 1,
    notes: params.notes,
  });
}

async fetchSubscription(subscriptionId: string) {
  if (this.isMock) return { id: subscriptionId, status: 'active' };
  return (this.razorpay as unknown as {
    subscriptions: { fetch(id: string): Promise<unknown> };
  }).subscriptions.fetch(subscriptionId);
}

async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = true) {
  if (this.isMock) return { id: subscriptionId, status: cancelAtCycleEnd ? 'active' : 'cancelled' };
  return (this.razorpay as unknown as {
    subscriptions: { cancel(id: string, cancelAtCycleEnd: boolean): Promise<unknown> };
  }).subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}
```

`verifyWebhookSignature(bodyStr, sig)` already exists — reuse.

### 2.3 Subscription service — `apps/api/src/modules/subscription/subscription.service.ts`

Full service, 326 lines. Key exports:

```ts
export type PlanKey = 'pro' | 'enterprise';

export const PLAN_SPECS: Record<PlanKey, PlanSpec> = {
  pro:        { key: 'pro',        name: 'GRID Pro',        amount_paise: 1_500_000, period: 'monthly', interval: 1,
                features: ['decision_engine','branded_proposals','deal_pipeline','team_collab',
                           'deal_vault','csv_export','gst_invoices','priority_concierge'] },
  enterprise: { key: 'enterprise', name: 'GRID Enterprise', amount_paise: 5_000_000, period: 'monthly', interval: 1,
                features: ['everything_in_pro','unlimited_team','api_access','white_label','sla'] },
};
```

Methods on `SubscriptionService`:
- `getActive(workspaceId)` — returns most recent sub with status in `['created','authenticated','active','pending']`
- `listForWorkspace(workspaceId)`
- `listInvoices(workspaceId)`
- `createCheckout({workspace_id, user_id, plan, customer_name, customer_email?, customer_phone?})` — blocks if active sub exists; creates Razorpay customer + subscription; inserts row; returns `{subscription_id, razorpay_subscription_id, razorpay_key_id, short_url, amount_paise, plan}`
- `cancel(workspaceId, subscriptionId, cancelAtCycleEnd=true)` — calls Razorpay cancel, updates status + `ended_at`, calls `downgradeWorkspace` if immediate
- `handleWebhook(event)` — dedupes by `event.id`, updates local sub row, on `.activated` calls `upgradeWorkspace`, on `.charged` inserts into `subscription_invoices` with `.onConflict('razorpay_invoice_id').ignore()`, on `.cancelled/.completed/.halted/.expired` calls `downgradeWorkspace`
- Private: `upgradeWorkspace(workspaceId, plan, subscriptionId)` — mutates `workspaces.metadata` JSONB to `{plan, razorpay_subscription_id, trial_ends_at: null}`
- Private: `downgradeWorkspace(workspaceId)` — mutates metadata to `{plan: 'free', razorpay_subscription_id: null, downgraded_at: now}`

Helper: `ensureRazorpayPlan(plan)` — checks `config.RAZORPAY_PLAN_ID_PRO` / `RAZORPAY_PLAN_ID_ENTERPRISE`; if unset, lazy-creates via Razorpay client and caches in module-level `planIdCache`.

Webhook unix→ISO helper: `const unixToIso = (s?: number) => s ? new Date(s * 1000).toISOString() : null`

### 2.4 Routes — `apps/api/src/modules/subscription/subscription.routes.ts`

Endpoints (all under `/v1/subscription/`):

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/status` | auth | Current plan + usage (briefs this month) + active sub |
| GET | `/plans` | public | Plan catalog (free/pro/enterprise) |
| POST | `/activate-trial` | auth | 14-day Pro trial; blocks if `trial_used` or already paid |
| POST | `/checkout` | auth | Body: `{plan, customer_name?, customer_email?, customer_phone?}` — returns Razorpay checkout payload |
| POST | `/cancel` | auth | Body: `{subscription_id, immediate?}` |
| GET | `/invoices` | auth | Billing history |
| POST | `/webhook` | public | Razorpay `subscription.*` events only |

`getUserWorkspace(userId)` helper: queries `workspace_members` where `user_id=?` AND `accepted_at IS NOT NULL` AND `is_active=true`, then joins `workspaces`.

Webhook handler ignores non-`subscription.*` events with `{success: true, data: {ignored: true}}` (payment.* go to `/v1/payments/webhook`).

Register in `apps/api/src/app.ts`:
```ts
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';
await app.register(subscriptionRoutes);
```

### 2.5 Billing UI — `apps/web/src/app/(dashboard)/event-company/billing/page.tsx`

Full page, ~400 lines. Sections top-to-bottom:

1. **Current plan hero** (`glass-card`): plan name, status badge, trial countdown if active, "Cancel at cycle end" button if subscribed, "Resume" if scheduled cancel
2. **Plan grid** (3 cards): Free (neutral), Pro (`border-[#c39bff]` accent + `btn-nocturne-primary`), Enterprise (`border-[#ffbf00]` gold)
3. **Trial CTA** — "Start 14-day Pro trial" button (hidden if `trial_used`)
4. **Checkout flow** — loads `https://checkout.razorpay.com/v1/checkout.js` via `useEffect`; on click, POST `/v1/subscription/checkout`, open `new window.Razorpay({subscription_id, key, handler, prefill, theme:{color:'#c39bff'}}).open()`; fallback to `window.open(short_url, '_blank')` if SDK unavailable
5. **Billing history** — table of invoices with paid/failed chips, invoice PDF download link

Global decl:
```ts
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}
```

Data fetching via `fetch(`${apiUrl}/v1/subscription/status`)` with auth header. On success/cancel, re-fetch status.

---

## 3. TASK 2 — ADMIN ANALYTICS (COMPLETE, VERIFY PENDING)

### 3.1 Backend — `apps/api/src/modules/admin/admin-analytics.routes.ts`

Three endpoints, all require `role='admin'` (check via `assertAdmin(userId)` helper).

#### GET `/v1/admin/analytics/funnel`
Returns activation counts + 7-day deltas:
```json
{
  "funnel": {
    "total_users": N, "workspaces_created": N, "briefs_submitted": N,
    "briefs_completed": N, "bookings_created": N, "bookings_confirmed": N,
    "pro_subscriptions": N
  },
  "supply": { "total_artists": N },
  "last_7_days": { "new_users": N, "new_briefs": N, "new_bookings": N }
}
```
Pro count via `whereRaw("metadata::text LIKE '%\"plan\":\"pro\"%'")`.

#### GET `/v1/admin/analytics/revenue`
```json
{
  "mrr_paise": N,           // sum of active/authenticated subs.amount_paise
  "arr_paise": N,           // mrr × 12
  "active_paid": N,
  "active_trials": N,       // workspaces with trial_ends_at > now
  "by_plan": { "pro": {count, mrr_paise}, "enterprise": {count, mrr_paise} },
  "revenue_30d_paise": N,   // sum(subscription_invoices.amount_paise where paid, last 30d)
  "churned_30d": N,         // subs ended in last 30d
  "scheduled_cancels": N    // active subs with cancel_at_cycle_end=true
}
```

#### GET `/v1/admin/analytics/agencies?limit=50&order=health_desc`
`order` ∈ `health_desc | health_asc | recent`. `limit` clamped [1, 200].

Per-row shape:
```json
{
  "workspace_id": "uuid", "name": "…", "plan": "pro|enterprise|free",
  "trial_ends_at": "iso|null",
  "subscription": { ...agency_subscriptions row or null },
  "briefs_30d": N, "bookings_30d": N, "active_members": N,
  "last_activity_at": "iso|null", "health_score": 0..100,
  "created_at": "iso"
}
```

**Health score formula:**
```
planScore    = plan === 'enterprise' ? 40 : plan === 'pro' ? 30 : 0
activityScore = min(30, briefs_30d * 3 + bookings_30d * 6)
teamScore    = min(15, active_members * 3)
recencyScore = last_activity_at ? max(0, 15 - floor((now - last_activity_at) / 86_400_000)) : 0
health       = min(100, sum)
```

Fetch `workspace_activity.max(created_at)` grouped by `workspace_id` with `.catch(() => [])` fallback since the table may not exist in all envs.

Register:
```ts
import { adminAnalyticsRoutes } from './modules/admin/admin-analytics.routes.js';
await app.register(adminAnalyticsRoutes);
```

### 3.2 Frontend — `apps/web/src/app/(dashboard)/admin/analytics/page.tsx`

Layout top-to-bottom:

1. **MRR hero** (`glass-card`, purple ambient glow):
   - Headline: "₹{rupeesShort(mrr)} MRR"
   - Subtitle: "₹{rupeesShort(arr)} ARR · {active_paid} paying agencies"
   - Progress bar to ₹1.5L target: `const mrrTarget = 150_000_00`, `pct = min(100, mrr_paise / mrrTarget * 100)`
   - Secondary: `{pct.toFixed(1)}% of ₹1.5L target`

2. **Stat cards grid** (`grid-cols-2 md:grid-cols-5 gap-4`):
   - Pro subs (purple tone), Enterprise subs (gold), Revenue 30d (cyan), Churned 30d (warn/rose), Active trials (default)
   - `<StatCard label value tone>` subcomponent with `tone: 'default'|'purple'|'cyan'|'gold'|'warn'`

3. **Activation funnel** (`glass-card`):
   - 4 steps: Users → Workspaces → Briefs → Bookings
   - Each step = `<FunnelStep label value prevValue icon>` showing count + conversion % from previous
   - Subtle bar widths proportional to count/total_users

4. **Agencies table** (`glass-card`):
   - Toolbar: search input (`<input class="input-nocturne">` filters by `name.toLowerCase().includes(q)`) + plan `<select>` (all/free/pro/enterprise) + order `<select>`
   - Columns: Agency (name + created_at), Plan (badge tinted by plan), Health (HealthBar), Briefs 30d, Bookings 30d, Members, Last activity, MRR
   - Click row → no-op for now (future: `/admin/agencies/{id}`)

5. **HealthBar component**:
   - 100-width bar, color green `#22c55e` if ≥70, gold `#ffbf00` if ≥40, rose `#f43f5e` else
   - Shows score number to right

Helpers at top of file:
```ts
const rupees = (paise: number) => (paise / 100).toLocaleString('en-IN');
const rupeesShort = (paise: number) => {
  const r = paise / 100;
  if (r >= 1e7) return `${(r/1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `${(r/1e5).toFixed(2)}L`;
  if (r >= 1e3) return `${(r/1e3).toFixed(1)}K`;
  return r.toFixed(0);
};
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN') : '—';
const pct = (n: number, d: number) => d > 0 ? ((n/d) * 100).toFixed(1) : '0.0';
```

Use `lucide-react` icons: `TrendingUp`, `Users`, `FileText`, `Calendar`, `CreditCard`, `AlertTriangle`, `Sparkles`.

Fetch all three endpoints in parallel on mount:
```ts
const [funnel, revenue, agencies] = await Promise.all([
  fetch(`${api}/v1/admin/analytics/funnel`, {headers}).then(r => r.json()),
  fetch(`${api}/v1/admin/analytics/revenue`, {headers}).then(r => r.json()),
  fetch(`${api}/v1/admin/analytics/agencies?limit=100`, {headers}).then(r => r.json()),
]);
```

### 3.3 Pending work
- [ ] `pnpm --filter @artist-booking/api lint` and `pnpm --filter @artist-booking/web lint` — fix any findings
- [ ] Add sidebar link in admin layout to `/admin/analytics` (likely `apps/web/src/app/(dashboard)/admin/layout.tsx` or a shared `AdminSidebar` component)
- [ ] Verify `adminAnalyticsRoutes` is registered in `apps/api/src/app.ts` alongside existing admin routes

---

## 4. TASK 3 — CONCIERGE UPGRADE (NOT STARTED)

**Goal:** white-glove onboarding and ongoing support queue for paying agencies.

### 4.1 Migration (proposed) — `packages/db/migrations/20260418000100_create_concierge_requests.ts`
```
concierge_requests
  id                 uuid pk
  workspace_id       uuid fk workspaces.id
  type               text check in ('onboarding','support','escalation','feature_request')
  priority           text check in ('low','medium','high','urgent') default 'medium'
  status             text check in ('open','assigned','in_progress','resolved','closed') default 'open'
  title              text
  description        text nullable
  assigned_to_user_id uuid nullable fk users.id
  sla_due_at         timestamptz nullable
  resolved_at        timestamptz nullable
  created_by_user_id uuid nullable fk users.id
  metadata           jsonb default '{}'
  created_at / updated_at

concierge_request_comments
  id                 uuid pk
  request_id         uuid fk concierge_requests.id
  user_id            uuid fk users.id
  body               text
  is_internal        boolean default false
  created_at
```

Indexes: `(workspace_id, status)`, `(assigned_to_user_id, status)`, `(sla_due_at) WHERE status IN ('open','assigned','in_progress')`.

### 4.2 Service — `apps/api/src/modules/concierge/concierge.service.ts`
Methods:
- `create({workspace_id, type, title, description?, priority?, sla_hours?})` — SLA default: onboarding=72h, support=24h, escalation=4h, urgent=2h
- `list({workspace_id?, status?, assigned_to_user_id?, limit?})`
- `get(id)` — includes comments
- `assign(id, userId)` — sets status → 'assigned'
- `updateStatus(id, status)` — on 'resolved' set `resolved_at=now`
- `addComment(requestId, userId, body, isInternal)`
- **Auto-create onboarding:** hook into `subscriptionService.upgradeWorkspace` (or fire a domain event) — on first `subscription.activated`, create `{type:'onboarding', title:'Onboard new {plan} customer', priority:'high', sla_hours:72}`

### 4.3 Routes — `apps/api/src/modules/concierge/concierge.routes.ts`
- `GET /v1/concierge/requests` — admin: all; agency user: filtered to own workspace
- `GET /v1/concierge/requests/:id`
- `POST /v1/concierge/requests` — agency-initiated support request
- `PATCH /v1/concierge/requests/:id` — admin only: assign, update status
- `POST /v1/concierge/requests/:id/comments`
- `GET /v1/admin/concierge/queue?status=open&priority=` — admin queue view with workspace names joined

### 4.4 UI
**`/admin/concierge/page.tsx`** — queue:
- Filter chips: status (open/assigned/in_progress/resolved), priority, type
- Sort by SLA due (overdue first), then priority
- Table: Request (title + workspace), Type badge, Priority badge, Assigned, SLA countdown (red if overdue), Created
- Click row → drawer with full detail + comment thread + assign/resolve actions

**`/event-company/billing/page.tsx`** — add small widget:
- "Your concierge" card showing assigned user name (if any) + count of open requests + CTA "New support request"

**`/event-company/concierge/page.tsx`** (optional) — full request history for the agency with ability to file new requests.

### 4.5 Notifications
- On request created → notify admin channel (WhatsApp/email to founders)
- On request assigned → notify agency: "Your dedicated concierge is {name}"
- On SLA breach (cron job) → notify both admin and agency
- On resolved → notify agency with summary + CSAT link (optional)

Add templates to `notification/template.registry.ts`:
- `concierge.onboarding_assigned`
- `concierge.request_received`
- `concierge.sla_warning`
- `concierge.resolved`

### 4.6 Cron
In `infrastructure/cron.ts` add:
- `checkConciergeSLA` — every 30min, find requests where `sla_due_at < now() AND status NOT IN ('resolved','closed')`, emit warning notification

---

## 5. DEPLOYMENT CHECKLIST

### 5.1 Apply migrations to Supabase
```bash
cd /Users/baba/ArtistAPP/artist-booking-platform/packages/db
pnpm migrate
```
If pooler blocks CLI, paste SQL from migration into Supabase SQL Editor.

Migrations added this sprint:
- `20260418000090_create_agency_subscriptions.ts` ✅ written
- `20260418000100_create_concierge_requests.ts` ⬜ TODO in Task 3

### 5.2 Environment variables (Render API)
```
# already present
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
RAZORPAY_MOCK_MODE=false

# new for Sprint 3
RAZORPAY_PLAN_ID_PRO=plan_xxx          # create via Razorpay Dashboard → Subscriptions → Plans
RAZORPAY_PLAN_ID_ENTERPRISE=plan_xxx
```

Without the `RAZORPAY_PLAN_ID_*` vars the service lazy-creates plans on first checkout — acceptable for dev, risky for prod (race conditions, plan sprawl).

### 5.3 Razorpay Dashboard config
1. Create two plans:
   - GRID Pro — monthly, interval 1, amount ₹15,000 (1,500,000 paise)
   - GRID Enterprise — monthly, interval 1, amount ₹50,000 (5,000,000 paise)
2. Copy plan IDs into Render env vars
3. Register webhook:
   - URL: `https://artist-booking-api.onrender.com/v1/subscription/webhook`
   - Secret: must match `RAZORPAY_WEBHOOK_SECRET`
   - Events (subscription-only): `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.expired`, `subscription.pending`, `subscription.paused`
4. The existing `/v1/payments/webhook` endpoint stays for `payment.*` events (dual webhooks by design)

### 5.4 Smoke test (mock mode first)
```
RAZORPAY_MOCK_MODE=true
```
1. POST `/v1/subscription/activate-trial` → workspace metadata has `plan=pro`, `trial_ends_at=+14d`
2. POST `/v1/subscription/checkout {plan:'pro'}` → returns mock `short_url`, row in `agency_subscriptions` with status `created`
3. Simulate webhook POST to `/v1/subscription/webhook` with a hand-crafted `subscription.activated` event → status flips to `active`, workspace metadata upgrades
4. GET `/v1/admin/analytics/revenue` → `mrr_paise = 1_500_000`, `active_paid = 1`
5. POST `/v1/subscription/cancel {subscription_id, immediate:false}` → `cancel_at_cycle_end=true`, workspace still Pro

Then flip `RAZORPAY_MOCK_MODE=false` for live.

---

## 6. ARCHITECTURE NOTES

- **Workspace plan source of truth:** `workspaces.metadata` JSONB. Keys: `plan`, `trial_ends_at`, `trial_used`, `trial_started_at`, `razorpay_subscription_id`, `downgraded_at`. Always read with `typeof === 'string' ? JSON.parse : obj`.
- **Money:** always **paise** in DB. Convert to ₹ only at UI/CSV/invoice boundary. 1 lakh = 1,00,000 = `10_000_000` paise.
- **Webhook idempotency:** dedupe by `razorpay_event_id` before any state change. Unique partial idx enforces at DB level.
- **Cancel at cycle end:** `cancel_at_cycle_end=true` keeps status `active` until Razorpay fires `subscription.completed` at cycle end; webhook then triggers downgrade. Immediate cancel sets `status='cancelled'` + `ended_at=now` + downgrade synchronously.
- **Trial:** 14 days, single-use per workspace (`trial_used=true` sticky). Trial → Pro paid does NOT require a separate upgrade — user just does checkout while trial active; on webhook activation, `trial_ends_at` cleared.
- **Dual webhook endpoints:** `/v1/payments/webhook` handles `payment.*` (existing escrow/booking flow); `/v1/subscription/webhook` handles `subscription.*` only. Each returns `{ignored:true}` for out-of-scope events.
- **Untyped Razorpay SDK:** plans/customers/subscriptions methods aren't in the type defs. Wrap with `(razorpay as unknown as {...}).method()` — don't fight the types.
- **Health score graceful fallback:** `workspace_activity` table may not exist in all envs. Use `.catch(() => [])` on that query so analytics endpoint never crashes.
- **RBAC:** admin endpoints gate on `users.role === 'admin'` via `assertAdmin(userId)` helper. Don't trust the JWT role claim alone.

---

## 7. KNOWN GAPS / DELIBERATE NON-GOALS

| Gap | Why deferred |
|---|---|
| Prorated upgrades Pro → Enterprise mid-cycle | Razorpay update_plan is complex; rare case; manual for now |
| Dunning emails on failed payment | Razorpay retries 4x automatically; user-facing dunning is v2 |
| GST invoices tied to subscription charges | Existing `gst-invoice` module is booking-only; subscription invoices use Razorpay-generated PDFs |
| Admin analytics date-range filter | Hard-coded 30d/7d windows sufficient for launch |
| Agencies table pagination | 200-row cap fine for <50 agencies; add cursor pagination at scale |
| Voluntary plan change audit log | No history table; only current state in metadata |

---

## 8. FILES TOUCHED THIS SPRINT

```
packages/db/migrations/20260418000090_create_agency_subscriptions.ts     NEW
apps/api/src/modules/payment/razorpay.client.ts                          EDIT (5 new methods)
apps/api/src/modules/subscription/subscription.service.ts                NEW (~326 lines)
apps/api/src/modules/subscription/subscription.routes.ts                 REWRITE (~225 lines)
apps/api/src/modules/admin/admin-analytics.routes.ts                     REWRITE (~225 lines)
apps/web/src/app/(dashboard)/event-company/billing/page.tsx              NEW (~400 lines)
apps/web/src/app/(dashboard)/admin/analytics/page.tsx                    NEW (~350 lines)
apps/api/src/modules/gst-invoice/gst-invoice.routes.ts                   LINT FIX line 163 (/[/\\]/ escape)
```

Not yet touched (Task 3):
```
packages/db/migrations/20260418000100_create_concierge_requests.ts       TODO
apps/api/src/modules/concierge/concierge.service.ts                      TODO
apps/api/src/modules/concierge/concierge.routes.ts                       TODO
apps/web/src/app/(dashboard)/admin/concierge/page.tsx                    TODO
apps/api/src/modules/notification/template.registry.ts                   EDIT (add 4 templates)
apps/api/src/infrastructure/cron.ts                                      EDIT (add SLA cron)
apps/web/src/app/(dashboard)/admin/layout.tsx                            EDIT (nav link /admin/analytics, /admin/concierge)
```

---

## 9. NEXT SESSION — START HERE

1. **Lint check first**
   ```bash
   cd /Users/baba/ArtistAPP/artist-booking-platform
   pnpm --filter @artist-booking/api lint
   pnpm --filter @artist-booking/web lint
   ```
   Fix anything that surfaces in `admin-analytics.routes.ts` / `admin/analytics/page.tsx` / new subscription files.

2. **Verify route registration**
   Grep `apps/api/src/app.ts` for `subscriptionRoutes` and `adminAnalyticsRoutes`. Add `app.register(...)` calls if missing.

3. **Add admin sidebar link**
   Find admin layout/sidebar component in `apps/web/src/app/(dashboard)/admin/` and add link to `/admin/analytics` (and later `/admin/concierge`). Use `lucide-react` icons `TrendingUp` and `Headphones`.

4. **Apply the subscriptions migration to Supabase**
   Either `pnpm migrate` in `packages/db` or paste the SQL into the Supabase SQL Editor.

5. **Build Task 3 — Concierge** in this order:
   a. Write migration `20260418000100_create_concierge_requests.ts`
   b. Write `concierge.service.ts` (create, list, assign, updateStatus, addComment)
   c. Hook `autoCreateOnboarding` into `subscriptionService.upgradeWorkspace` (or emit event)
   d. Write `concierge.routes.ts` (agency + admin endpoints)
   e. Add notification templates + SLA cron job
   f. Build `/admin/concierge/page.tsx` queue UI
   g. Add concierge widget to billing page
   h. Register routes in `app.ts`

6. **Smoke test the full flow** end-to-end in mock mode, then flip to live and run one real ₹15K Pro subscription purchase.

---

## 10. 90-DAY PLAN PROGRESS

| Sprint | Days | Status | Deliverables |
|---|---|---|---|
| Sprint 1 | 1–30 | ✅ | Homepage pivot, /agency/join, agency dashboard Kanban, /pricing |
| Sprint 2 | 31–60 | ✅ | Deal vault, team collaboration, proposal templates, GST invoices |
| Sprint 3 | 61–90 | 🚧 | Razorpay subscriptions ✅, Admin analytics ⚠️ verify, Concierge upgrade ⬜ |

**Target:** 10 paying agencies × ₹15,000/mo = **₹1,50,000 MRR** by end of Sprint 3.

---

## 11. CRITICAL DO-NOTS

- Do **not** read entire files into main context — use grep/glob/sub-agents
- Do **not** read `node_modules/`, `dist/`, `.next/`, `.turbo/`, `*.lock`, `*.min.*`
- Do **not** claim "done" without verifying DB → API → frontend render chain
- Do **not** skip the lint gate — Vercel build fails on any ESLint error
- Do **not** create duplicate files or unnecessary new modules when an existing one fits
- Do **not** hardcode colors/spacing — use Nocturne tokens
- Do **not** use `--amend`, `git reset --hard`, `push --force` without explicit ask
- Do **not** create .md docs unless the user asks (this handoff is one of those)
- Money is in **paise** — never store or compare rupees in DB
- Every webhook handler must be idempotent
