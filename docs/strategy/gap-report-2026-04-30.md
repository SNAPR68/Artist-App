# GRID Event OS — Gap Audit (READ-ONLY)

_Audit date: 2026-04-30_
_Scope: 113 migrations · 50+ API modules · 32 event-file endpoints · WhatsApp EC bot · web dashboard_
_Method: targeted grep + read across `packages/db/migrations/`, `apps/api/src/modules/`, `apps/web/src/app/(dashboard)/event-company/`. No files written or modified during audit._

---

## Phase 1 — Sales & Acquisition

| Feature | Status | Location | Gap |
|---|---|---|---|
| Lead capture (web `/brief`, public) | EXISTS COMPLETE | `apps/web/.../brief`, `decision-engine` module | — |
| Lead capture via WhatsApp (CREATE_BRIEF) | EXISTS COMPLETE | `whatsapp/whatsapp-conversation.service.ts` | — |
| Pilot lead form + Slack ping | EXISTS COMPLETE | `pilot` route, `SLACK_PILOT_WEBHOOK_URL` | — |
| **EC sales pipeline / CRM** (lead → qualified → proposal → won) | **MISSING** | no `leads`, `pipeline`, `sales_funnel`, or `deal_stage` migration | No table, no module, no UI |
| Quotes / estimates pre-event | EXISTS PARTIAL | `booking_quotes` table (artist-only), `proposal-templates` for presentations | Vendor-agnostic quote builder for the EC's *client* (not the artist's quote to the EC) is missing |
| Proposal/presentation builder for EC client | EXISTS COMPLETE | `proposal-templates` module, `workspace_presentations` | — |
| Win/loss tracking | MISSING | no field on `event_files` or `workspace_events` for source/won_at/lost_reason | Cannot measure conversion |
| EC Inbox (incoming inquiries unified view) | EXISTS PARTIAL | `event-company/inbox/page.tsx` exists | Likely just messages — verify wiring; no lead-state column |

## Phase 2 — Event Planning

| Feature | Status | Location | Gap |
|---|---|---|---|
| Event File (single container per event) | EXISTS COMPLETE | `event_files` table, full CRUD route, 5-tab dashboard | — |
| Vendor roster (multi-category) | EXISTS COMPLETE | `event_file_vendors` join table | — |
| Brief JSONB on event_file | EXISTS COMPLETE | `event_files.brief` jsonb | — |
| Budget envelope | EXISTS PARTIAL | `event_files.budget_paise` exists | No per-category budget split, no plan-vs-actual |
| BOQ (line items, edit, PDF) | EXISTS COMPLETE | `event-file/boq.*` (service + generator + UI tab) | — |
| Call sheet (PDF + xlsx + dispatch) | EXISTS COMPLETE | `call-sheet.*` + `call_sheet_dispatches` table | — |
| Consolidated rider | EXISTS COMPLETE | `consolidated-rider.*` + `consolidated_rider_artifacts` table | — |
| Timeline / run-of-show | MISSING | no `run_of_show` / `event_timeline` / `cue` table | Call sheet has call_time only, no scene-by-scene ROS |
| Tasks / checklist per event | MISSING | no `event_tasks`, no `checklist_items` migration | EC can't assign internal todos |
| Permits / NOC tracking (police, fire, PPL/IPRS, society) | MISSING | zero hits in migrations or modules; only `voice-intent` keyword + dead `outbound-voice` script reference "permit" | No `event_permits` table, no doc-vault for permit PDFs, no expiry alerts |
| Insurance / liability docs | MISSING | no `event_insurance` or `liability_certificate` field | — |
| Venue selection (BEO, room block) | EXISTS PARTIAL | `venue_profiles` + `venue_artist_history` | Per CLAUDE: "venue / BEO / RFP — cut from MVP" — **intentional**, not a gap |
| Guest list / RSVP | MISSING (intentional per CLAUDE) | no migration | Cut from MVP |

## Phase 3 — Vendor Operations

| Feature | Status | Location | Gap |
|---|---|---|---|
| Vendor schema (multi-category) | EXISTS COMPLETE | `artist_profiles` + `category` enum + `category_attributes` jsonb (GIN-indexed) | Polymorphic shortcut documented & accepted |
| 5 categories + 2 add-on (artist/av/photo/decor/license/promoters/transport) | EXISTS COMPLETE | enum `vendor_category` | — |
| Vendor search / filters | EXISTS COMPLETE | `search` module, 80 vendors seeded | — |
| Vendor onboarding flow | EXISTS PARTIAL | `vendor.routes.ts` + `event-company/vendors/page.tsx` | Self-serve vendor onboarding URL flow (not via search) — verify; for EC's *private* vendors no `private_vendor` flag |
| Vendor confirmation token (public link) | EXISTS COMPLETE | `event_file_vendors.confirmation_*`, `/v1/vendor-confirm/:token` route | — |
| Vendor day-of check-in | EXISTS COMPLETE | `event_file_vendors.checkin_*` (mig 107) + `/day-of-checkins` endpoint | — |
| Send vendor confirmations bulk (WA) | EXISTS COMPLETE | EC bot intent `ec_send_confirmations` | — |
| Vendor payment / advance (PO, advance %) | MISSING | no `purchase_order`, no `vendor_advance`, no `po_number` | Bookings have `final_amount_paise` but no advance/balance split tracked separately |
| Vendor performance/rating per event | EXISTS PARTIAL | `review` module, `reputation-defense` | Tied to bookings, not specifically per-event-file post-event |
| Vendor doc vault (GST cert, PAN, agreement) | EXISTS PARTIAL | `vault` module + `document` module | Verify usage in EC flow; no per-vendor required-docs checklist |

## Phase 4 — Artist Booking (incl. rider deep-check)

| Feature | Status | Location | Gap |
|---|---|---|---|
| Artist profile, search, recommend | EXISTS COMPLETE | `artist`, `recommendation`, `decision-engine` modules | — |
| Booking lifecycle + state machine | EXISTS COMPLETE | `booking/state-machine.ts`, `booking_events` audit | — |
| Quote / negotiation | EXISTS COMPLETE | `booking/negotiation.service.ts` + `booking_quotes` | — |
| Contract generation | EXISTS PARTIAL | `booking/__tests__/contract.test.ts` exists | Verify generator file — likely DOCX template; no e-sign integration |
| Artist rider — schema | EXISTS PARTIAL | `artist_riders` (1 row per artist), `rider_line_items`, `rider_venue_checks` | Rider is **per artist**, not **per booking** — cannot tweak rider for a specific event without versioning the artist's master rider. `version` int exists but no booking-specific override. |
| Hospitality / travel JSONB on rider | EXISTS COMPLETE | `artist_riders.hospitality_requirements`, `travel_requirements` | — |
| Rider PDF generation | EXISTS COMPLETE | `rider/rider.routes.ts` + consolidated rider per event | — |
| Rider venue compatibility checks | EXISTS COMPLETE | `rider_venue_checks` table | — |
| Per-event rider amendments | **MISSING** | no `event_file_rider_overrides` or `booking_rider_snapshot` table | EC can't say "for this event, no whisky, add 3 extra towels" without editing master |
| Artist availability / hold | EXISTS COMPLETE | calendar + booking system | — |
| Artist payout (TDS 10%, escrow) | EXISTS COMPLETE | `payment/tds.service.ts`, `payment_settlements`, `payout_transfers` | — |

## Phase 5 — Event Execution (Day-Of)

| Feature | Status | Location | Gap |
|---|---|---|---|
| Day-of WA check-ins (vendor self-report) | EXISTS COMPLETE | EC bot `ec_send_checkins` + `/day-of-checkins` | — |
| Roster live status (confirmed/pending/declined) | EXISTS COMPLETE | EC bot `ec_roster_status` + dashboard chips | — |
| Manual status override | EXISTS COMPLETE | `PATCH /event-files/:id/vendors/:vendorId/status` | — |
| Live ROS editor | MISSING (intentional per CLAUDE) | — | Cut from MVP |
| Crew voice polling | MISSING (intentional) | — | Cut from MVP |
| **Incident log / issue tracker** | **MISSING** | no `event_incidents` or `issue_log` table | No way to record "stage power tripped at 21:40, fixed by 21:55" |
| Walkie/radio/comms channel mapping | MISSING | — | Likely out of scope, but no field on call sheet |
| Show-time triggers / cue automation | MISSING (intentional) | — | — |
| Photo/proof-of-execution upload | EXISTS PARTIAL | `media` + `vault` modules | Not wired into event_file day-of tab |

## Phase 6 — Finance & Reconciliation

| Feature | Status | Location | Gap |
|---|---|---|---|
| Razorpay integration + escrow (8 states) | EXISTS COMPLETE | `payment/razorpay.client.ts`, escrow logic | Mock mode now; live KYC pending |
| Split calculator (artist/agent/platform) | EXISTS COMPLETE | `payment/split-calculator.ts` | — |
| TDS auto-calc + PAN storage (encrypted) | EXISTS COMPLETE | `payment/tds.service.ts`, `artist_profiles.pan_encrypted` | — |
| Form 16A / Form 26Q export | EXISTS PARTIAL | TDS service comments mention "Form 16A–style payload"; verify the payload builder | No tested export endpoint visible in routes; no PDF |
| GST invoice (CGST/SGST/IGST split, sequential numbering) | EXISTS COMPLETE | `gst-invoice` module + `gst_invoices` + `workspace_gst_settings` | — |
| Financial dashboard (artist-side) | EXISTS COMPLETE | `financial-command` module | Artist-scoped — see gap below |
| **EC-side financial dashboard** (event P&L: budget vs spent vs received) | **MISSING** | `financial-command.service.ts` resolves an `artistId` only | No event-level P&L view for the EC |
| Vendor PO ledger / advance tracking | MISSING | no `vendor_po`, no advance fields | EC can't track "paid 50% to AV vendor on 12 Apr" |
| Client billing (EC → its end client) | EXISTS PARTIAL | GST invoice infra exists | No flow to issue invoice from event_file (just from booking) |
| Reconciliation (match payment received vs invoice issued) | MISSING | no `reconciliation` module, no matching logic | — |
| Refund / cancellation finance | EXISTS COMPLETE | booking cancellation + refunds | — |

## Phase 7 — Post-Event

| Feature | Status | Location | Gap |
|---|---|---|---|
| Event status → completed | EXISTS COMPLETE | `event_file_status` enum has `completed` | — |
| Final settlement to vendors | EXISTS COMPLETE | `payment_settlements` + `payout_transfers` | Artist-booking only; non-artist vendor payouts are not in the same flow |
| Vendor reviews | EXISTS COMPLETE | `review` module | — |
| Client testimonial / case study | MISSING | no `case_study` or `testimonial` table | — |
| Post-event debrief | MISSING (intentional per CLAUDE) | — | Cut from MVP |
| Deal-vault (booking history, CSV export) | EXISTS COMPLETE | `deal-vault` module — workspace-scoped over `bookings + workspace_events` | EC view should expand to include non-artist vendor lines too |
| Event analytics (margin, vendor mix, repeat client) | EXISTS PARTIAL | `analytics` module + `attribution` | Verify EC-specific dashboards exist; no event-level margin report visible |
| Archive / data export (DPDP Act) | EXISTS PARTIAL | `vault` + `document` modules | Verify a one-click export-all-event-data endpoint |

---

## Deep-Check A — Vendor Schema (`artist_profiles` polymorphic)

```
category              ENUM(artist|av|photo|decor|license|promoters|transport)
                      NOT NULL DEFAULT 'artist'
category_attributes   JSONB  NOT NULL DEFAULT '{}'   (GIN-indexed)
```

Per-category JSONB shapes documented in migration `20260422000097` (Zod-enforced):

- **artist:** genres, languages, setup_minutes, has_own_sound
- **av:** max_watts, stage_size_ft, light_units, led_wall_sqft, truss_available
- **photo:** photographers, videographers, drone, same_day_edit, backup_shooter
- **decor:** themes, flower_types, setup_hours, indoor_outdoor, custom_fab
- **license:** license_types, cities_covered, turnaround_days, govt_fees_included
- **promoters:** staff_types, min_headcount, rate_per_head, uniform_included
- **transport:** vehicle_types, cities, with_driver, fuel_included, standby_hourly_rate

**Gap:** no `private_vendor_for_workspace_id` column → all vendors are global; an EC can't keep a private rolodex distinct from GRID's public marketplace.

## Deep-Check B — Rider Schema

- `artist_riders` (1 per artist, `version` int, hospitality + travel JSONB)
- `rider_line_items` (category enum, priority enum, alternatives text[])
- `rider_venue_checks` (compatibility with venue spec)
- `consolidated_rider_artifacts` (per event_file output PDF blob/url)

**Gaps:**
1. Rider is **per-artist master**, not **per-booking snapshot** — if the artist updates the master, it leaks into past events' artifacts unless re-rendered.
2. No `event_file_rider_overrides` table for per-event tweaks.
3. Non-artist vendors have **no rider concept** — an AV vendor's tech rider lives only in `category_attributes` JSONB and free-text notes.

## Deep-Check C — WhatsApp EC Bot Intents

Total: **7 intents** (`ec-conversation.service.ts:29-105`)

| Intent | Action | Status |
|---|---|---|
| `ec_list_events` | numbered list of upcoming events | ✅ |
| `ec_call_sheet` | generate + return PDF/xlsx URL | ✅ |
| `ec_roster_status` | confirmed/pending/declined breakdown | ✅ |
| `ec_send_confirmations` | bulk WA to vendors w/ confirm token | ✅ |
| `ec_send_checkins` | day-of ping all vendors | ✅ |
| `ec_boq` | BOQ summary / link | ✅ |
| `ec_rider` | consolidated rider PDF link | ✅ |

Disambiguation state machine: ✅ (numbered reply → `__ec_pending_intent`).

**Missing intents (likely high-value):**

- `ec_create_event` (new event from WA brief)
- `ec_add_vendor` ("add Soundwave to Sunburn")
- `ec_budget_status` ("how much left in Sunburn budget")
- `ec_payment_status` ("kya payments pending hain")
- `ec_incident` ("log issue: stage power tripped")
- `ec_reschedule` (date/time change broadcast)

## Deep-Check D — Permits / NOC

**Result: zero infra.** Grep across `packages/db/migrations/` and `apps/api/src/modules/` for `permit|noc|fire|police|ppl|iprs|society|liability|insurance_certificate` returns **only**:

- `voice-intent.service.ts` keyword map (`'permit': 'license'`)
- `outbound-voice/outbound-voice.scripts.ts` (dead code per CLAUDE)

No `event_permits` table, no document storage tied to permit type, no expiry tracking, no approval-status workflow, no UI tab. **This is a real Indian-market gap** — every concert/wedding needs PPL + IPRS + Police + sometimes Fire NOC + Society NOC.

## Deep-Check E — Deal Vault & Contracts

`deal-vault` module = read-only search/export over `bookings` joined to `workspace_events`. Filters by state, date range, artist, free-text on artist/event/client. CSV export gated. **Strong** for booking history.

**Contract gaps:**

- `booking/__tests__/contract.test.ts` exists → there's a contract generator somewhere (likely `booking.service.ts`)
- No standalone `contracts` table; contract is presumably a generated artifact, not a tracked entity
- **No e-signature integration** (DocuSign / Digio / Leegality)
- **No contract template per workspace** (only proposal templates)
- **No contract status tracking** (drafted / sent / signed / countersigned)
- Non-artist vendors → no contract generator at all

---

## Master Build Priority

| # | Feature | Effort | Impact | Why now |
|---|---|---|---|---|
| 1 | **Permits/NOC tracking** (table, doc vault, expiry alerts, EC bot intent) | M | Critical | Indian compliance gap; blocks pilot conversations |
| 2 | **EC sales pipeline** (`leads` table, stages, source, won/lost, simple Kanban) | M | Critical | No way to measure conversion; pilots will ask "how do I track inquiries" |
| 3 | **EC-side event P&L** (budget vs vendor spend vs client billing) | M | Critical | Financial-command is artist-only; ECs need this on day 1 |
| 4 | **Vendor PO / advance tracking** (`vendor_purchase_orders`, advance %, balance) | M | High | Real cashflow problem for ECs; pairs with #3 |
| 5 | **Per-booking rider snapshot + per-event overrides** (`booking_rider_snapshot` table) | S | High | Prevents master-rider edit leak; small schema change |
| 6 | **EC bot intents v2** (`ec_create_event`, `ec_add_vendor`, `ec_budget_status`, `ec_payment_status`, `ec_incident`) | M | High | The product *is* the bot; 7 intents is the floor |
| 7 | **Incident log** (`event_incidents` table, day-of UI tab, WA intent) | S | High | Differentiator for ops-heavy ECs |
| 8 | **Tasks / checklist per event** (`event_tasks` table, assignee, due date) | S | High | Universal need; trivial to ship |
| 9 | **Run-of-show / timeline** (`event_timeline_items`, render in call sheet) | M | Medium | High-value but call sheet covers 70% today |
| 10 | **Contract status + e-sign integration** (Digio API + status enum + per-vendor contracts) | L | Medium | Cosmetic for pilot; legal-moat post-pilot |
| 11 | **Form 16A export endpoint + PDF** (TDS service has payload, no route) | S | Medium | Lawyer-review item, not pilot-blocker |
| 12 | **Reconciliation matching** (invoice ↔ payment-received) | L | Medium | Real but post-revenue |
| 13 | **Private vendor rolodex** (`workspace_id` nullable on `artist_profiles`, or join table) | M | Low | Comes up after agency #5 |
| 14 | **Case study / testimonial capture** (`case_studies` table, public page) | S | Low | Marketing helper |
| 15 | **One-click DPDP data export per event** (zip of files+pdfs+messages) | M | Low | Lawyer ask; not a blocker |

**Pilot-blocker subset (must ship before paid customer):** #1, #2, #3, #5, #6 (core 3-4 intents), #7, #8 — ~3-4 weeks of focused work.

---

_End of audit._
