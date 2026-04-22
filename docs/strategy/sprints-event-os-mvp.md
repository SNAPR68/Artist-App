# GRID Event Company OS — Full Sprint Document

**Version:** 1.0
**Date:** 2026-04-22
**Owner:** Raj
**Duration:** 49 days (35-day MVP + 14-day pilot)
**Goal:** Ship the minimum viable Event Company OS and land 2 paying pilot agencies.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Positioning & Scope Decisions](#2-positioning--scope-decisions)
3. [Architecture Principles](#3-architecture-principles)
4. [Sprint A — Vendor Category Foundation (Week 1–2)](#sprint-a--vendor-category-foundation-week-1-2)
5. [Sprint B — Unified Event File + Voice Extension (Week 3–4)](#sprint-b--unified-event-file--voice-extension-week-3-4)
6. [Sprint C — Call Sheet + Day-of Check-ins (Week 5)](#sprint-c--call-sheet--day-of-check-ins-week-5)
7. [Sprint D — Pilot & Iterate (Week 6–7)](#sprint-d--pilot--iterate-week-6-7)
8. [Cross-Sprint Concerns](#8-cross-sprint-concerns)
9. [Success Metrics](#9-success-metrics)
10. [Risk Register](#10-risk-register)
11. [Appendix — Data Model](#11-appendix--data-model)
12. [Appendix — API Surface](#12-appendix--api-surface)

---

## 1. Executive Summary

### The shift
GRID v1 was "artist booking with voice automation." GRID v2 is the **Event Company Operating System** — a single event file that holds the client, every vendor (artist + caterer + AV + photo + decor), the call sheet, and the day-of check-in log.

### Why now
An operational audit found GRID covers ~15% of one of ten domains event companies actually run. The "Agency OS" positioning is not credible without multi-vendor coverage. The artist booking voice engine is generic enough to handle every vendor category — we are not building new muscle, we are retargeting the existing muscle.

### The MVP
Five capabilities. Thirty-five days.

1. Multi-vendor booking across 5 categories: artist, caterer, AV, photo, decor
2. Unified Event File: client + all vendors under one event record
3. Outbound voice engine extended to all 5 categories (category-specific intake scripts)
4. Auto call sheet PDF + SMS/WhatsApp/email broadcast to every vendor and crew member
5. Day-of ROS-triggered "ETA?" check-in voice calls, logged per booking

### What is explicitly cut from MVP
Inbound voice, financial reconciliation, live ROS editor, crew voice polling, post-event debrief calls, venue RFP/BEO, guest RSVP/ticketing, creative/mood boards, marketing pipeline. All deferred to v2 or later.

### Commercial target
5 paying agencies at ₹15,000/month within 60 days of MVP ship (₹75K MRR on top of existing base).

---

## 2. Positioning & Scope Decisions

### Decision 1: No inbound voice
**Status:** Cut permanently.
**Reason:** Agencies want humans on first client touch; an AI answering damages trust. Intake already runs on four surfaces: `/brief` web form, WhatsApp, Zara/Kabir in-browser voice, and referrals. A fifth channel is redundant and introduces brittle new infra (phone provisioning, compliance, carrier relationships) for no customer pull.

### Decision 2: Shortcut over clean refactor on data model
**Status:** Shortcut taken.
**Reason:** Refactoring `artist_profiles` into a polymorphic `vendors` table touches 13+ existing tables and adds 3 weeks to the MVP. Instead, we add a `category` enum column to `artist_profiles` and a `category_attributes` JSONB column. The UI reskins to "vendors." The clean refactor moves to month 3+ when paying customers surface edge cases that justify the cost.

### Decision 3: Call sheet PDF over live run-of-show editor
**Status:** Cut live ROS from MVP.
**Reason:** A PDF call sheet + SMS broadcast captures ~80% of the coordination value. Live ROS with real-time vendor-aware re-sequencing is a month-long build by itself and can be added when agencies ask for it.

### Decision 4: Outbound-only voice
**Status:** Locked.
**Reason:** Outbound is the wedge. Agencies cannot call 50 vendors in 10 minutes — GRID can. Inbound voice is a commodity anyone can buy from Vapi or Retell.

### Decision 5: 5 vendor categories, not 10
**Status:** Locked.
**Reason:** Caterer, AV, photo, decor cover the vendors agencies book on every event. Lighting, florist, transport, security, staffing can be added post-pilot by inserting new enum values + category templates — no schema work.

---

## 3. Architecture Principles

### Principle 1: Reuse, don't rebuild
GRID already has the modules needed. Stack them.

| Need | Existing module |
|---|---|
| Outbound voice | `voice-query` + Zara/Kabir infrastructure |
| Messaging | `notification` (WhatsApp, SMS, Push, Email — 37 templates) |
| PDF generation | `document` (contracts, invoices — extend for call sheets) |
| Event container | `workspace_events` + `workspace_event_bookings` |
| Intake brain | `decision-engine` + `clarifying-questions.service.ts` |
| Auth/RBAC | 92 permissions across 5 roles |

### Principle 2: Additive migrations only
No column drops, no table renames, no FK changes during MVP. Every migration adds; nothing removes. Rollback is always safe.

### Principle 3: UI reskin, backend gradient
Frontend copy flips from "Artists" to "Vendors" in Sprint A. Backend tables keep `artist_profiles` / `artist_id` names. Route aliases (`/vendors` → `/artists`) preserve backwards compatibility. The polymorphic refactor is a separate project post-MVP.

### Principle 4: Category attributes go in JSONB
Each vendor category has unique fields (caterers have cuisine + guest capacity; AV has gear list; photos have deliverables + hours). These live in `artist_profiles.category_attributes` JSONB, validated at the API layer by category-specific Zod schemas. No per-category tables.

### Principle 5: Voice intake scripts are configuration, not code
Category-specific voice intake scripts are JSON templates (questions + validation rules) loaded by the same voice booking state machine. Adding a 6th category = write a JSON file, not a code change.

---

## Sprint A — Vendor Category Foundation (Week 1–2)

**Duration:** 10 working days
**Goal:** Event companies can browse, shortlist, and view profiles for 5 vendor categories (artist, caterer, AV, photo, decor).

### A.1 Outcomes
1. Every `artist_profiles` row has a category; non-artist categories are seeded with 20 vendors each
2. Event-company-facing UI says "Vendors" with category filter chips
3. Category-specific profile templates render correctly for each type
4. Shortlist and search APIs accept category filters

### A.2 Deliverables

**Database migrations (2 files):**
- Migration 96: add `category` enum + column to `artist_profiles`, default `'artist'`, backfill all existing rows
- Migration 97: add `category_attributes` JSONB column to `artist_profiles`, default `'{}'`

**Shared package:**
- `VendorCategory` enum in `@artist-booking/shared/enums`
- Category-specific Zod schemas in `@artist-booking/shared/schemas/vendor-attributes.ts`:
  - `CatererAttributesSchema` (cuisines, guest_capacity, dietary_options, equipment_included)
  - `AVAttributesSchema` (gear_inventory, stage_sizes_supported, crew_count)
  - `PhotoAttributesSchema` (package_hours, deliverables, turnaround_days, style_tags)
  - `DecorAttributesSchema` (style_tags, min_guest_count, max_guest_count, setup_hours)
  - `ArtistAttributesSchema` (act_type, set_duration_min, genre_tags) — wraps existing fields

**API:**
- New route group `/vendors` mounted as an alias of `/artists` in `apps/api/src/modules/artist/` — add category filter parameter, otherwise identical
- `POST /vendors/:id/shortlist` already works via `shortlist` module, no change
- `GET /vendors?category=caterer&city=Mumbai` — paginated search by category

**Frontend:**
- Rename sidebar item "Artists" → "Vendors" in event-company dashboard (not in artist dashboard)
- New `/vendors` route as primary entry; `/artists` stays as alias for SEO
- Category filter chip row on discovery page: All | Artists | Caterers | AV | Photo | Decor
- Vendor profile page: conditional render of category-specific section using `category` field
- Shortlist UI shows category badge per entry

**Seed data (80 new records):**
- 20 caterers across Mumbai, Delhi, Bangalore (mix of Indian, Continental, vegetarian-only)
- 20 AV vendors (sound + lights + LED wall providers, varying gear tiers)
- 20 photographers (wedding, corporate, event specialists)
- 20 decor vendors (floral, thematic, minimalist styles)
- Category-specific attributes populated realistically

### A.3 File-Level Task List

| # | Task | Files touched | Owner | Effort |
|---|---|---|---|---|
| A1 | Migration 96 (category enum + column) | `packages/db/migrations/20260423000096_add_vendor_category.ts` | Backend | 0.5d |
| A2 | Migration 97 (category_attributes JSONB) | `packages/db/migrations/20260423000097_add_category_attributes.ts` | Backend | 0.5d |
| A3 | `VendorCategory` enum + attribute schemas | `packages/shared/src/enums/vendor-category.ts`, `packages/shared/src/schemas/vendor-attributes.ts` | Backend | 1d |
| A4 | `/vendors` route module (aliases artist search) | `apps/api/src/modules/vendor/vendor.routes.ts`, `vendor.service.ts`, `vendor.schema.ts` | Backend | 1.5d |
| A5 | Category-aware validation middleware | `apps/api/src/modules/vendor/vendor.validation.ts` | Backend | 0.5d |
| A6 | Seed script (80 vendors) | `packages/db/seeds/06_vendor_categories.ts` | Backend | 1d |
| A7 | Event-company sidebar: Artists → Vendors | `apps/web/src/app/(dashboard)/event-company/layout.tsx` | Frontend | 0.25d |
| A8 | `/vendors` page with category filter chips | `apps/web/src/app/(dashboard)/event-company/vendors/page.tsx` | Frontend | 1.5d |
| A9 | Vendor profile template switcher | `apps/web/src/app/vendors/[slug]/page.tsx`, `components/vendor-profile/*.tsx` | Frontend | 2d |
| A10 | Shortlist: category badge + mixed list | `apps/web/src/app/(dashboard)/event-company/shortlist/page.tsx` | Frontend | 0.5d |
| A11 | SEO: redirect old `/artists/:slug` → `/vendors/:slug` with 301 | `apps/web/src/middleware.ts` | Frontend | 0.25d |
| A12 | Integration tests | `e2e/vendor-browse.spec.ts` | QA | 0.5d |

**Total:** 10 days with 1 backend + 1 frontend dev in parallel.

### A.4 Acceptance Criteria

1. `SELECT category, COUNT(*) FROM artist_profiles GROUP BY category` returns 5 rows with non-zero counts
2. Event company opens `/vendors`, sees filter chips, clicks "Caterer" → grid shows only caterers
3. Clicking a caterer shows caterer-specific fields (cuisines, guest capacity) — not artist fields
4. Shortlist with 1 artist + 1 caterer + 1 AV persists and renders correctly on reload
5. `/artists/:slug` returns 301 to `/vendors/:slug`
6. All existing artist-booking flows work unchanged (regression)
7. E2E test suite green

### A.5 Out of Scope for Sprint A

- Booking flow changes (Sprint B)
- Voice extension (Sprint B)
- Event File linkage (Sprint B)
- Call sheet (Sprint C)

---

## Sprint B — Unified Event File + Voice Extension (Week 3–4)

**Duration:** 10 working days
**Goal:** An event company creates one event, books at least 3 different vendor categories under it via voice, all bookings visible on one page.

### B.1 Outcomes
1. Every `workspace_event` has a client attached (FK)
2. `workspace_event_bookings` carries category metadata for fast grouping
3. Voice booking engine accepts `vendor_category` and loads the right intake script
4. Event detail UI groups bookings by category with a single "Add vendor" flow

### B.2 Deliverables

**Database migrations (2 files):**
- Migration 98: `workspace_events.client_id UUID REFERENCES client_profiles(id)` — nullable for legacy rows, required for new
- Migration 99: `workspace_event_bookings.category` (denormalized from vendor for query performance), `workspace_event_bookings.call_time TIMESTAMPTZ` (used in Sprint C)

**Voice engine:**
- 5 category-specific intake script JSON files in `apps/api/src/modules/voice-booking/scripts/`:
  - `artist-intake.json` (existing flow, formalized)
  - `caterer-intake.json` (guest count, cuisines, dietary mix, service style, service time window)
  - `av-intake.json` (stage dimensions, lighting requirement, sound tier, LED wall, crew count)
  - `photo-intake.json` (coverage hours, deliverables, second shooter y/n, deadline)
  - `decor-intake.json` (theme, guest count, setup window, teardown window, hero pieces)
- Script loader service: `voice-booking.service.ts` picks the right script based on `vendor_category`
- Voice state machine: unchanged; only the question set swaps

**API:**
- `POST /events` body extended: `{ client_id, title, event_date, city, venue, notes }`
- `POST /events/:id/bookings` body: `{ vendor_id, category, requested_date, requirements }` — validates vendor.category matches booking.category
- `POST /events/:id/bookings/voice-start` — triggers outbound voice booking with category-aware script
- `GET /events/:id` response schema: bookings grouped by category

**Frontend:**
- Event create modal: client dropdown (searchable against client_profiles), event title, date, city, venue, notes
- Event detail page redesign:
  - Header: event metadata + client card
  - Body: 5 accordion sections (one per category) with booking cards inside
  - "Add vendor" CTA per section → category pre-filled in vendor picker modal
  - "Book via Voice" secondary CTA → launches outbound call flow
- Booking card shows: vendor name, status, agreed amount, call_time (blank until Sprint C)

### B.3 File-Level Task List

| # | Task | Files touched | Owner | Effort |
|---|---|---|---|---|
| B1 | Migration 98 (event.client_id) | `packages/db/migrations/20260506000098_add_event_client_id.ts` | Backend | 0.5d |
| B2 | Migration 99 (booking.category + call_time) | `packages/db/migrations/20260506000099_add_booking_category_and_call_time.ts` | Backend | 0.5d |
| B3 | Update workspace module create/update event | `apps/api/src/modules/workspace/workspace.routes.ts`, `workspace.service.ts` | Backend | 1d |
| B4 | Category-aware booking validation | `apps/api/src/modules/booking/booking.validation.ts` | Backend | 0.5d |
| B5 | Voice intake script files (5 JSON) | `apps/api/src/modules/voice-booking/scripts/*.json` | Backend | 2d |
| B6 | Voice booking script loader + state machine hook | `apps/api/src/modules/voice-booking/voice-booking.service.ts` | Backend | 2d |
| B7 | `/events/:id` response grouping | `apps/api/src/modules/workspace/event.service.ts` | Backend | 0.5d |
| B8 | Event create modal (client picker) | `apps/web/src/components/event-create-modal.tsx` | Frontend | 1d |
| B9 | Event detail page redesign (grouped bookings) | `apps/web/src/app/(dashboard)/event-company/events/[id]/page.tsx` | Frontend | 2d |
| B10 | "Add vendor" modal with category pre-fill | `apps/web/src/components/add-vendor-modal.tsx` | Frontend | 1d |
| B11 | Voice booking launch button + status polling | `apps/web/src/components/voice-booking-launcher.tsx` | Frontend | 1d |
| B12 | E2E: full event + 3-category booking flow | `e2e/event-multi-vendor-booking.spec.ts` | QA | 1d |

**Total:** 13 days of work — feasible in 10 calendar days with 1 backend + 1 frontend in parallel, slim on buffer.

### B.4 Acceptance Criteria

1. Agency creates event "Reliance Annual Day, 15 Jun 2026, Mumbai" with client "Reliance Industries" attached
2. Agency triggers voice booking for a caterer (200 guests, veg + non-veg mix, Indian cuisine). Voice agent asks caterer-specific questions (not artist questions). Booking saves with category=`caterer`
3. Agency triggers voice booking for AV (stage 20x16, LED wall, 2-person crew) and a DJ (4hrs, EDM). All three bookings appear under the same event, grouped by category
4. Reloading event detail shows 3 bookings in correct sections (Catering, AV, Artists) with correct vendor names
5. Backwards-compat: existing artist-only bookings on legacy events still render in the Artists section

### B.5 Out of Scope for Sprint B

- Call sheet generation (Sprint C)
- Day-of check-ins (Sprint C)
- Financial reconciliation (v2)

---

## Sprint C — Call Sheet + Day-of Check-ins (Week 5)

**Duration:** 5 working days
**Goal:** Event file auto-generates a call sheet PDF; SMS/WhatsApp/email broadcast reaches every vendor; day-of check-in voice calls fire 60 minutes before each vendor's call time and log responses.

### C.1 Outcomes
1. One click generates a Nocturne-styled call sheet PDF from event data
2. Broadcast endpoint sends the call sheet to all vendors via all contact channels in parallel
3. A cron worker scans upcoming bookings and triggers check-in voice calls on schedule
4. Check-in responses (on-the-way / confirmed / no-answer / delayed) are logged per booking and visible in the event dashboard

### C.2 Deliverables

**Document module extension:**
- New template `call-sheet-template.tsx` using existing Nocturne PDF styling
- `documentService.generateCallSheet(eventId)` — fetches event + bookings + venue + client → renders PDF
- Template sections: event header, client contact, venue + map link, vendor roster grouped by category with call times, emergency contacts

**Notification broadcast endpoint:**
- `POST /events/:id/send-call-sheet` — fetches all vendor contacts, fans out to `notification` module in parallel (WhatsApp + SMS + email, one call per vendor per channel)
- Uses existing notification templates (new template ID: `CALL_SHEET_DELIVERY`)
- Logs broadcast attempt in `workspace_event_bookings.call_sheet_sent_at`

**Cron worker `check-in-dispatcher`:**
- New worker in `apps/api/src/workers/check-in-dispatcher.ts`
- Runs every 15 minutes
- Query: `SELECT * FROM workspace_event_bookings WHERE call_time BETWEEN now() + interval '45 minutes' AND now() + interval '75 minutes' AND check_in_status IS NULL`
- For each match: call `voice-query` module's outbound `initiateCheckIn(bookingId)` function
- Voice script: "Hi, this is GRID confirming you're on track for [event] at [venue], call time [X]. Are you on your way?"
- Result options: `on_the_way` | `confirmed_arrived` | `delayed` | `no_answer` | `issue`
- Logs result + transcript to `workspace_event_bookings.check_in_status`, `check_in_logged_at`, `check_in_transcript`

**Migration (1 file):**
- Migration 100: add `call_sheet_sent_at`, `check_in_status`, `check_in_logged_at`, `check_in_transcript` to `workspace_event_bookings`

**Frontend:**
- Event detail: "Generate Call Sheet" button → preview modal with PDF → "Send to all vendors" confirmation CTA
- Call time input per booking card (date-time picker; defaults to event_date minus 4 hours)
- Day-of dashboard: traffic-light status per vendor (green = confirmed, yellow = on_the_way/no_answer, red = issue/delayed)
- Manual "Call now" button on each booking for coordinator override

### C.3 File-Level Task List

| # | Task | Files touched | Owner | Effort |
|---|---|---|---|---|
| C1 | Migration 100 (call sheet + check-in columns) | `packages/db/migrations/20260520000100_add_call_sheet_and_checkin_cols.ts` | Backend | 0.25d |
| C2 | Call sheet PDF template | `apps/api/src/modules/document/templates/call-sheet-template.tsx` | Backend | 1d |
| C3 | `generateCallSheet` service method | `apps/api/src/modules/document/document.service.ts` | Backend | 0.5d |
| C4 | Broadcast endpoint + notification template | `apps/api/src/modules/workspace/event.routes.ts`, `notification.templates.ts` | Backend | 1d |
| C5 | Check-in dispatcher cron worker | `apps/api/src/workers/check-in-dispatcher.ts` | Backend | 1d |
| C6 | Outbound check-in voice flow | `apps/api/src/modules/voice-query/check-in.service.ts` | Backend | 1d |
| C7 | Call sheet preview modal + send button | `apps/web/src/components/call-sheet-preview-modal.tsx` | Frontend | 0.5d |
| C8 | Call time picker on booking cards | `apps/web/src/components/booking-card.tsx` | Frontend | 0.5d |
| C9 | Day-of dashboard with traffic lights | `apps/web/src/app/(dashboard)/event-company/events/[id]/day-of/page.tsx` | Frontend | 1d |
| C10 | Manual "Call now" override button | `apps/web/src/components/booking-card.tsx` | Frontend | 0.25d |
| C11 | Load test: 50 concurrent check-in calls | `e2e/load-checkin-dispatcher.spec.ts` | QA | 0.5d |

**Total:** ~7.5 days of work — tight fit in 5 calendar days; may need frontend to start Sprint C on Sprint B last day.

### C.4 Acceptance Criteria

1. Agency clicks "Generate Call Sheet" on an event with 3 bookings → PDF renders in <3 seconds with correct data
2. Clicking "Send to all vendors" triggers WhatsApp + SMS + email to every vendor; notification table shows 9 sent records (3 vendors × 3 channels)
3. Cron worker triggers check-in calls 60 minutes before each booking's `call_time`; 50 concurrent calls succeed without voice infra queueing errors
4. A vendor picks up → voice agent asks "Are you on your way?" → vendor says "yes, 20 minutes away" → booking record shows `check_in_status='on_the_way'`, transcript stored
5. Day-of dashboard shows 3 traffic-light indicators; vendor who didn't answer shows yellow; coordinator clicks "Call now" and manually triggers retry
6. A full pilot event runs: create event → book 3 vendors → send call sheet 24h before → check-ins fire day-of → dashboard reflects real status

### C.5 Out of Scope for Sprint C

- Automated retry logic if vendor doesn't answer (v2)
- Crew/freelancer check-ins (v2 — same engine, different roster)
- Post-event debrief calls (v2)

---

## Sprint D — Pilot & Iterate (Week 6–7)

**Duration:** 14 calendar days
**Goal:** 2 paying pilot agencies run real events through GRID; instrument metrics; fix real-world bugs.

### D.1 Pilot Onboarding

**Target agencies (confirm week 1):**
- Agency 1: Mumbai-based, 20+ events/year, currently uses spreadsheets + WhatsApp groups
- Agency 2: Delhi-based, 30+ events/year, currently uses HoneyBook + Canva

**White-glove onboarding checklist:**
- Import existing client list (CSV → client_profiles bulk insert)
- Import existing vendor network (CSV → artist_profiles with categories)
- Train 1 event coordinator per agency on vendor browsing, event creation, voice booking
- Configure notification templates with agency branding
- Dry-run one mock event end-to-end before first real event
- Dedicated Slack/WhatsApp channel for live support during first 2 weeks

### D.2 Metrics Instrumentation

Install PostHog events for every critical action:

| Event | Trigger | Target metric |
|---|---|---|
| `event.created` | Event row insert | Baseline |
| `vendor.booking.initiated` | Voice or manual booking start | Volume per event |
| `vendor.booking.confirmed` | Booking state → confirmed | Funnel conversion |
| `call_sheet.generated` | PDF render complete | — |
| `call_sheet.broadcast_sent` | Broadcast fan-out complete | Delivery rate |
| `check_in.call_initiated` | Cron dispatches call | — |
| `check_in.call_answered` | Vendor picks up | Answer rate |
| `check_in.response_logged` | Status captured | Completion rate |

**Dashboards to build:**
- Per-agency funnel: events → vendors-booked/event → call-sheet-sent/event → check-ins-answered/event
- Time metrics: time-from-brief-to-first-booking, time-from-event-create-to-call-sheet-sent
- Failure rates: voice call failures, broadcast delivery failures, cron dispatcher errors

### D.3 Bug Fix Budget

Reserve 50% of Sprint D capacity for bug fixes surfaced by real usage. Expected categories:
- Voice intake edge cases (vendors who don't follow the script, background noise, language switching)
- Notification delivery failures (invalid phone numbers, opt-out lists, rate limits)
- PDF rendering edge cases (events with 10+ vendors, long venue names, non-ASCII characters)
- Timezone bugs (call_time interpretation, cron trigger windows)

### D.4 Decision Point — End of Week 7

Based on pilot data, choose next sprint direction:

| Signal | Next focus |
|---|---|
| Agencies booking 2+ categories per event, paying on time | Crew/freelancer voice polling (add 6th surface) |
| Agencies want financial visibility (P&L per event) | Sprint E: budgets + reconciliation |
| Category shortcuts causing real bugs | Polymorphic `vendors` refactor |
| Agencies want to add venue workflows | Sprint E: venue sourcing + BEO basics |
| Low adoption, churn risk | Pause features, double-down on pilot success |

### D.5 Acceptance Criteria

1. Both pilot agencies run at least 2 real events through GRID with 3+ vendor categories
2. 80% of events get an auto call sheet
3. 60% of check-in calls successfully log a response
4. At least one pilot agency verbally commits to ₹15K/mo paid plan
5. Metrics dashboards live and reviewed weekly

---

## 8. Cross-Sprint Concerns

### Deployment
- Every migration runs via Supabase SQL Editor (per CLAUDE.md rule), not CLI
- Feature flag: `EVENT_OS_VENDOR_CATEGORIES=true` gates new UI until Sprint A acceptance passes
- Deploy cadence: Sprint A end, Sprint B end, Sprint C end (3 production pushes in 5 weeks)

### Testing
- Unit tests for all new services (vendor category, voice scripts, call sheet renderer, check-in dispatcher)
- E2E tests for the 3 acceptance flows (browse → shortlist, event create → multi-vendor booking, call sheet → check-in)
- Load test: 50 concurrent check-in calls in Sprint C (voice infra bottleneck risk)
- Regression: existing artist booking flow must work unchanged after every sprint

### Security & Compliance
- Voice transcripts contain PII (vendor names, phone numbers, event details) — store in `check_in_transcript` with existing AES-256-GCM encryption on the column
- Call sheet PDFs stored in Supabase storage with signed URLs, 7-day expiry
- Outbound voice calls only to vendors who opted in at vendor onboarding (add opt-in checkbox in Sprint A)
- Rate limits on broadcast endpoint: max 1 send per event per hour (prevent spam)

### Observability
- Sentry alerts on: cron dispatcher failures, voice call failures, PDF render errors, notification delivery failures
- PostHog funnel alerts if event → booking conversion drops below 50% week-over-week

### Backwards Compatibility
- `/artists` routes remain as 301 redirects to `/vendors` equivalents for SEO
- Existing bookings without `category` field inherit `category='artist'` via migration backfill
- Legacy event pages render correctly with or without `client_id`

---

## 9. Success Metrics

### Ship-level (end of Sprint C)
- All Sprint A, B, C acceptance criteria pass
- Zero P0 regressions in existing artist booking flow
- Load test passes: 50 concurrent check-in calls without errors

### Pilot-level (end of Sprint D)
- **Coverage:** ≥60% of pilot events book at least 2 vendor categories via GRID
- **Call sheets:** ≥80% of pilot events auto-send a call sheet
- **Check-ins:** ≥70% of scheduled check-in calls receive a logged response
- **Satisfaction:** both pilot agencies rate GRID ≥4/5 in weekly feedback

### Commercial (60 days post-MVP ship)
- 5 paying agencies at ₹15,000/month = ₹75,000 incremental MRR
- Cumulative target: 10 paying agencies at ₹15K = ₹1.5L MRR (original 90-day goal intact)
- Pilot → paid conversion: ≥1 of 2 pilot agencies signs paid within 30 days of pilot end

---

## 10. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Voice engine too artist-specific to accept category scripts without refactor | Medium | High | Day 1 Sprint A: audit `voice-query.service.ts` and booking state machine; if hardcoded, add 3-day buffer to Sprint B |
| R2 | 50 concurrent check-in calls overwhelm voice infra | Medium | High | Load test Sprint C day 1; if fails, implement call queue with 10 concurrent max |
| R3 | Category attributes JSONB becomes schema debt | Low | Medium | Validate rigorously with Zod at API layer; revisit in month 3 |
| R4 | Agencies resist "Vendors" rename ("we book artists, not vendors") | Medium | Low | Keep "Artists" as primary filter chip, "Vendors" as superset label; customize per workspace if needed |
| R5 | Pilot agencies don't adopt voice booking (coordinator muscle memory) | High | Medium | Dedicated training session; coordinator sits with GRID team for first 3 events |
| R6 | Notification delivery failures at scale (MSG91/WhatsApp rate limits) | Medium | Medium | Existing `notification` module has rate limit handling; monitor delivery rates in Sprint D |
| R7 | PDF call sheet renders slowly for events with many vendors | Low | Low | Pre-warm PDF worker; acceptable up to 20 vendors per sheet |
| R8 | Legal/compliance question on outbound voice calls to vendors | Low | High | Vendor onboarding captures explicit consent for voice calls; legal review before Sprint C production push |
| R9 | Supabase migration failure in production | Low | High | Test on staging branch first; every migration is additive and reversible |
| R10 | Sprint C timeline slips due to cron worker complexity | Medium | Medium | Have backend lead start worker stub at Sprint B week 2 as parallel track |

---

## 11. Appendix — Data Model

### Modified Tables (Sprint A–C)

```sql
-- Sprint A
ALTER TABLE artist_profiles
  ADD COLUMN category vendor_category NOT NULL DEFAULT 'artist';
ALTER TABLE artist_profiles
  ADD COLUMN category_attributes JSONB NOT NULL DEFAULT '{}';

CREATE TYPE vendor_category AS ENUM ('artist', 'caterer', 'av', 'photo', 'decor');

-- Sprint B
ALTER TABLE workspace_events
  ADD COLUMN client_id UUID REFERENCES client_profiles(id);
ALTER TABLE workspace_event_bookings
  ADD COLUMN category vendor_category;
ALTER TABLE workspace_event_bookings
  ADD COLUMN call_time TIMESTAMPTZ;

-- Sprint C
ALTER TABLE workspace_event_bookings
  ADD COLUMN call_sheet_sent_at TIMESTAMPTZ,
  ADD COLUMN check_in_status TEXT,
  ADD COLUMN check_in_logged_at TIMESTAMPTZ,
  ADD COLUMN check_in_transcript TEXT;
```

### Category Attributes — JSONB Shapes

```typescript
// Caterer
{
  cuisines: string[],              // ['Indian', 'Continental', 'Chinese']
  guest_capacity_min: number,
  guest_capacity_max: number,
  dietary_options: string[],       // ['veg', 'non-veg', 'jain', 'halal', 'vegan']
  service_styles: string[],        // ['buffet', 'plated', 'live-counters']
  equipment_included: boolean
}

// AV
{
  gear_tiers: string[],            // ['basic', 'standard', 'premium']
  stage_sizes_supported: string[], // ['10x8', '20x16', '40x30']
  lighting: boolean,
  led_wall: boolean,
  crew_count: number
}

// Photo
{
  package_hours: number[],         // [4, 6, 8, 10]
  deliverables: string[],          // ['raw', 'edited', 'album', 'video']
  turnaround_days: number,
  style_tags: string[],            // ['candid', 'traditional', 'cinematic']
  second_shooter_available: boolean
}

// Decor
{
  style_tags: string[],            // ['floral', 'thematic', 'minimalist', 'luxury']
  guest_count_min: number,
  guest_count_max: number,
  setup_hours: number,
  teardown_hours: number,
  hero_pieces_included: boolean
}

// Artist (existing fields wrapped)
{
  act_type: string,                // 'DJ', 'Singer', 'Band', etc.
  set_duration_min: number,
  genre_tags: string[]
}
```

---

## 12. Appendix — API Surface

### New Endpoints (Sprint A–C)

```
# Sprint A
GET    /vendors?category=<cat>&city=<city>&page=<n>
GET    /vendors/:slug
GET    /vendors/:id/availability

# Sprint B
POST   /events                              body: { client_id, title, event_date, city, venue, notes }
PATCH  /events/:id
GET    /events/:id                          response: bookings grouped by category
POST   /events/:id/bookings                 body: { vendor_id, category, requested_date, requirements }
POST   /events/:id/bookings/voice-start     body: { vendor_id, category }

# Sprint C
POST   /events/:id/call-sheet/generate      returns signed URL to PDF
POST   /events/:id/call-sheet/send          body: { channels: ['sms','whatsapp','email'] }
PATCH  /events/:id/bookings/:bid/call-time  body: { call_time }
POST   /events/:id/bookings/:bid/check-in   body: { manual: true }   # coordinator override
GET    /events/:id/day-of                   response: check-in status per booking
```

### Existing Endpoints (unchanged, documented for reference)

- All `/artists/*` routes preserved as aliases
- `/notification/send` used internally by broadcast endpoint
- `/document/generate` used internally by call sheet service
- `/voice-query/initiate` used internally by check-in dispatcher

---

---

## 13. Locked Decisions — Extension (2026-04-22, post-review)

After a decision-locking session with Raj, the MVP scope was revised. **This section supersedes any conflicting content in sections 1–12.**

### 13.1 Revised vendor categories

**MVP (5):** `artist | av | photo | decor | license`
**Sprint D week 1 add-on (2):** `promoters | transport`

**Changes from v1.0:**
- **Dropped `caterer`** — wedding-heavy, not the ICP (corporate/brand events). Catering is venue-bundled or client-direct.
- **Kept AV bundled** (sound + lights + stage) — matches medium-event reality. Agencies book one AV vendor for all three. Large-concert split doesn't apply — those clients don't come through the platform.
- **Added `license`** — PPL/IPRS/Novex/Police NOC/Fire NOC/Excise/Loudspeaker. **Model A: onboard license agents as vendors** (marketplace, not managed service). Evaluate Model B (managed fulfillment) in month 2 based on pilot pull.
- **`venue` excluded from MVP** — client-decided in the agency workflow we're targeting. Revisit month 3 if pilot agencies ask.
- **`promoters` + `transport` ship Sprint D week 1** — on-site manpower + artist/crew logistics. High-value but not day-1 blockers; agencies can still run end-to-end events with the 5 core categories.

### 13.2 Added MVP capabilities (beyond v1.0)

**Added:**
1. **Tech rider consolidation** — auto-merge individual artist tech riders into one master rider PDF + Excel for the AV vendor. **Both upload paths** (artist profile + agency override at booking). Effort: 3 days.
2. **BOQ builder** — line-item cost sheet per event (artist + AV + photo + decor + margin + taxes). Exports PDF + Excel. **Re-upload = file-of-record** (no parse-back to DB). Effort: 5 days.
3. **Media standardization Layers 1 + 2** — FFmpeg transcode worker + Sharp image pipeline + standardized microsite at `/a/[slug]`. Zero layout customization, every artist gets the same structure. Effort: 7 days.
4. **Instagram OAuth + data sync** — Option A (official IG Business API). Auto-populate microsite video gallery from top 6 reels, live follower count, 30d reach for "trending" sort. Meta app review **submitted Day 1 Sprint A** (runs parallel, no timeline hit). Effort: 4 days.
5. **Call sheet email channel added** — SMS + WhatsApp + Email (Resend integration already in notification module). Effort: +0.5 day.

**Deferred to Sprint D week 2 (post-pilot-start):**
- **EPK export bundle** — one-sheet PDF + Excel + PPTX slide insert + 90s MP4 reel. All generated on-demand from Layer 1 assets. Effort: 5 days.

### 13.3 CTO calls (locked)

**BOQ re-upload: file-of-record.**
Parsing Excel back into DB requires a locked template and breaks if agencies add/remove rows or columns — becomes a support nightmare. File-of-record: re-uploaded `.xlsx` becomes the authoritative BOQ; DB retains original line items for reference; agency can regenerate fresh from DB anytime. Ships in 1 day vs. 4. Revisit month 3 if pilot agencies push back.

**IG integration: Option A (OAuth + data sync).**
Without live IG data, the microsite is a re-upload chore artists won't do. With OAuth, we auto-populate galleries from content artists already post daily. Meta app review (2–3 weeks) runs parallel to Sprint A dev. Fallback: if Meta rejects, Option B (paste URLs) ships in 1 day.

### 13.4 Pilot + pricing (locked)

**Pilot agencies:** not pre-committed. Recruit during Sprint C. Build MVP without lined-up pilots.
**Pricing during pilot:** **free.** No pricing until post-pilot.
**Success metric revision:** drop "5 paying agencies at ₹15K/mo within 60d" from Sprint D definition. Replace with: "2 agencies actively using MVP for real bookings; pricing decision made month 3 based on willingness-to-pay signals."

### 13.5 Revised timeline

| Sprint | Scope | Days |
|---|---|---|
| A — Vendor foundation | 5 categories (artist/av/photo/decor/license), JSONB attrs, UI reskin, voice scripts, **Meta app review submitted Day 1** | 12 (+1 for license) |
| B — Event File + voice + media layers 1+2 | client_id, call_time, voice extended, **transcode worker + microsite `/a/[slug]` + IG OAuth** | 21 (+11 for media/IG) |
| C — Call sheet + check-ins + tech rider + BOQ | Call sheet PDF+Excel SMS+WA+Email, day-of voice, tech rider merge, BOQ builder | 13.5 |
| D wk1 | Promoters + transport categories, pilot recruitment starts | 5 |
| D wk2 | EPK bundle, pilot iteration | 5 |
| **Total** | | **~56 working days (~11 weeks)** |

**Note:** v1.0 doc cited 35 days. The feature additions above expand scope to ~11 weeks. This is a deliberate expansion — Raj approved each addition individually during the 2026-04-22 review as core differentiators, not nice-to-haves.

### 13.6 Explicit cuts reaffirmed

Unchanged from v1.0:
- No inbound voice (ever).
- No financial reconciliation in MVP.
- No live ROS editor in MVP.
- No crew voice polling in MVP.
- No post-event debrief calls in MVP.
- No venue/guest RSVP/mood boards/marketing pipeline.

New cuts:
- **No caterer category** (dropped entirely, not deferred).
- **No managed license service** (marketplace model A only).

### 13.6a Voice engine refactor — LOCKED (post-audit)

**Finding (Day 1 Sprint A audit):** voice-query module has structural hard-coupling to `artist_profiles` in 2 files:
- `apps/api/src/modules/voice-query/voice-intent.service.ts:174–190` — `loadArtistNames()` / `loadCities()` query `artist_profiles` directly
- `apps/api/src/modules/voice-query/voice-execution.service.ts:106–143, 728–755` — `handleDiscover` has hardcoded schema fields (`base_city`, `genres`, `trust_score`, `bio`); `ROUTE_MAP` is artist-only (`/artist/bookings`, `/artist/earnings`)

**Decision:** refactor, don't duplicate. 70–105 hrs (~2 weeks) scheduled in Sprint B.

**Refactor plan:**
1. Rename `loadArtistNames` → `loadVendorNames(category: VendorCategory)`
2. Extract vendor-agnostic profile interface; move artist-specific fields into `category_attributes` JSONB reads
3. Dynamic `ROUTE_MAP` keyed on `(userRole, vendorCategory)`
4. Rename `resolved_artist_id` → `resolved_vendor_id` in `voice-context.service.ts`
5. Default `userRole = 'artist'` in execution context — require explicit role, no default

**Why refactor vs duplicate:** copy-paste path would cost 5× duplicated handlers, 2–3× tech debt, and block Sprint B voice extension anyway. Mechanical refactor is cleaner and ships category-genericity once.

### 13.7 What's unlocked, what's still open

**Unlocked for Sprint A kickoff:**
- Category list ✅
- Tech rider source ✅ (both)
- BOQ re-upload ✅ (file-of-record)
- IG integration ✅ (Option A)
- Pilot timing ✅ (defer recruitment to Sprint C)
- Pricing ✅ (free pilot)
- Call sheet channels ✅ (SMS + WA + Email)
- AV bundling ✅ (keep bundled)
- Venue ✅ (out)

**Still open (can be resolved during Sprint A, not blocking):**
- Voice scope per category — confirm same 6 intents (availability/quote/hold/confirm/reschedule/cancel) for each vendor type, or trim. Default: same 6 intents; script variance is only in the "spec questions" section per category.
- Microsite slug collision policy (e.g., two "Raja Kumar"s) — default: auto-suffix with city (`raja-kumar-mumbai`).
- License agent seed count — default: 15 agents across 5 cities (Mumbai, Delhi, Bangalore, Pune, Hyderabad).

---

## Document Control

**Last updated:** 2026-04-22 (Extension section 13 added post-decision-review)
**Next review:** End of Sprint A — update with actual velocity and scope adjustments
**Related documents:**
- `docs/strategy/prd.md` Part 2 (sections 22–31)
- `memory.md` — session notes
- `CLAUDE.md` — critical pivot summary
- Global auto-memory: `project_event_os_pivot.md`
