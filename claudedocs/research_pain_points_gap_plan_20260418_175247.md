# Real-World Pain Points, GRID Coverage & Gap Plan
**Date:** 2026-04-18
**Scope:** Indian live-entertainment industry — event companies + artists
**Method:** Web research (9 queries) + codebase audit cross-reference

---

## Executive Summary

- Indian event industry is **₹47,000 Cr+** market growing to ₹70,000 Cr by 2030 (KPMG/IBEF). Top 3 pain themes worldwide map almost 1:1 onto India but with unique local multipliers: cash-heavy weddings, 18% GST compliance burden, WhatsApp-as-OS for vendors, no unified regulatory framework.
- **Artists' #1 problem is payment unreliability** — delays, partial pay, ghosting. Most gigs still run on verbal agreements; contracts + late-payment penalties are rare. This is an industry-wide systemic failure, not a tooling gap.
- **Event companies' #1 problem is speed-to-proposal + vendor coordination**. Planners who respond inside 1 hour book 3× more than same-day responders. 30–45 min of setup per event × 20 weddings = 10–15 hrs/yr of pure overhead per planner.
- **Competitive landscape is fragmented**: Gigwell/Stagent/Overture own the Western agency-OS space (€99–€799/mo), but none speak Indian context (₹ pricing, WhatsApp-native, GST invoices, Hindi/Hinglish). StarClinch, Hire4Event, BookMyShow-for-artists (BMT) dominate India on the marketplace side, but none offer a true workflow OS for agencies.
- **GRID's current posture**: ~60% of the critical pain surface is addressed in code (escrow, decision engine, rider, event-day, reviews, workspace, voice AI). ~30% is backend-only with newly-added UI (billing, Kanban, rider, event-day, concierge). ~10% is genuinely missing (WhatsApp-native flows, live-pay split, client portal, legal boilerplate, regulatory/permit helper).

---

## 1. Pain Points — Event Companies / Agencies / Planners

| # | Pain Point | Evidence | Severity |
|---|---|---|---|
| 1 | **Slow proposal turnaround** — responding in hours, not minutes, loses deals | Aplos AI: "1-hr response = 3× more bookings" | Critical |
| 2 | **Manual admin overhead** — 30–45 min setup per event, 10–15 hrs/yr lost | Aplos AI | Critical |
| 3 | **18% GST complexity** — invoicing, ITC claims, reverse-charge on unregistered vendors | ClearTax, AuthBridge | Critical |
| 4 | **No unified national regulatory framework** — permits vary city-by-city, entertainment tax surcharges | EVM Institute, KPMG | High |
| 5 | **Skills gap** — informal entry, inconsistent execution quality | EVM Institute | Medium |
| 6 | **Artist discovery is fragmented** — StarClinch, Hire4Event, Instagram DMs, word-of-mouth | Search industry | High |
| 7 | **Last-minute cancellations / no-show artists** — replacement guarantees exist but not standardized | Boho Weddings, StarClinch | High |
| 8 | **Vendor communication = WhatsApp chaos** — 50+ chats per event, no source of truth | Wappmaster, Gallabox | Critical |
| 9 | **Client portal missing** — clients ask "status?" daily; planners re-explain | HoneyBook/Dubsado gap analysis | High |
| 10 | **Contract + deposit chasing** — unsigned docs sit 48+ hrs; payments slip | Aplos AI | High |
| 11 | **High tech investment cost** — platforms + training + marketing squeeze margins | KPMG | Medium |
| 12 | **Multi-city / destination wedding logistics** — travel + crew permits + venue-artist sync | Industry reports | High |

---

## 2. Pain Points — Artists / Performers

| # | Pain Point | Evidence | Severity |
|---|---|---|---|
| 1 | **Payment delays / partial pay / non-payment** — "not isolated, happens across the country" | Indian Music Diaries, Soundhammer | Critical |
| 2 | **No written contracts** — bands rely on "the word of the organizer" | Indian Music Diaries, iPleaders | Critical |
| 3 | **No late-payment penalties in agreements** | iPleaders | High |
| 4 | **Opaque market rates** — can't benchmark their own pricing | VenueLook, BMT blog | High |
| 5 | **Discovery depends on word-of-mouth** — no owned distribution | Indian Music Diaries | High |
| 6 | **Technical rider ignored/lost** — equipment mismatch cancels performances | StarClinch, "booking mistakes" guides | High |
| 7 | **Cash-only gigs** — bad for tax, credit history, scalability | Industry interviews | High |
| 8 | **Career career invisibility** — no reputation graph, no proof-of-work | Indian Music Diaries | Medium |
| 9 | **Agent commissions unclear** — 15–40% skimmed, often without transparent splits | iPleaders | Medium |
| 10 | **No emergency-pullout protection** when a gig is cancelled last-minute | Boho Weddings | High |
| 11 | **GST registration burden** — artists crossing ₹20L threshold must register | GST law | Medium |
| 12 | **Venue + sound check disputes on event day** — no neutral record | Rider research | Medium |

---

## 3. Competitive Landscape (What India Lacks)

| Platform | Geography | Strength | Weakness vs India |
|---|---|---|---|
| **Gigwell** | US/EU | End-to-end booking, contracts, revenue tracking | No ₹, no GST, no WhatsApp, English-only, expensive |
| **Stagent** | EU | Roster + bookings, €99/mo | Same as Gigwell |
| **Overture** | EU/NA | 55k agents, mature | Dated UI, no Indian market fit |
| **HoneyBook / Dubsado** | US | Proposal-to-payment automation | Weddings only, US tax/contracts |
| **Planning Pod** | US | All-in-one | Generic, not artist-centric |
| **StarClinch** | India | Marketplace, 18k+ artists | Marketplace only — no agency workflow |
| **Hire4Event** | India | Corporate events | Booking-layer, no SaaS workflow |
| **BookMyShow (BMT)** | India | Celebrity bookings | Transactional, no CRM |
| **VenueLook** | India | Venue discovery | Adjacent market |
| **WedMeGood / ShaadiDukaan** | India | Wedding vendors | Directory, no workflow OS |

**GRID's unique positioning**: the **only** Indian-native workflow OS targeting the agency (B2B SaaS at ₹15K/mo). No incumbent combines: decision engine + escrow payments + rider + event-day + voice AI + GST invoices.

---

## 4. Pain-Point → GRID Feature Matrix

Legend: ✅ Built & in-UI · 🟡 Backend only / partial UI · ❌ Missing

### Event Company Coverage

| Pain | GRID Coverage | Status | Where |
|---|---|---|---|
| Slow proposal turnaround | Decision engine → recommendations → proposal PDF | ✅ | `/brief`, `generateProposal` |
| Admin overhead | Workspace, events, pipeline, voice-fill forms | ✅ | `/client/workspace/[id]`, `VoiceFillButton` |
| GST compliance / invoices | Invoice PDFs for bookings; subscription invoices stub | 🟡 | `/billing/invoices` (UI stubbed — **needs API completion**) |
| Regulatory permits | — | ❌ | Not in scope currently |
| Artist discovery | Search, decision engine, 5K+ seeded artists | ✅ | `/search`, AI tools |
| Last-minute cancellation | emergency-substitution module + `/client/substitutions` | ✅ | API + UI both wired |
| WhatsApp communication | whatsapp module (backend) | 🟡 | No UI for planners |
| Client portal | Presentation public URL (`/presentations/[slug]`) | 🟡 | Read-only PDF link; no back-and-forth chat |
| Contract chasing | Booking detail page + contract PDF download | ✅ | `canDownloadContract` in booking detail |
| Deposit chasing | Escrow + Razorpay + payment reminders | ✅ | `/client/bookings/[id]/pay` |
| Multi-city logistics | coordination module (backend), event-day (UI new) | 🟡 | No multi-city travel planner yet |
| Brand-aligned proposals | Workspace branding in presentations | ✅ | workspace.service.ts |
| Team collab | `/workspace/[id]/team` + roles | ✅ | Team page |
| Pipeline Kanban | **Drag-drop just shipped** | ✅ | `workspace/[id]/page.tsx` |
| Subscription billing | **Trial + invoice stub just shipped** | ✅ | `/billing` + `/billing/invoices` |

### Artist Coverage

| Pain | GRID Coverage | Status | Where |
|---|---|---|---|
| Payment delays | Escrow (8-state, auto-settlement) | ✅ | payment + financial-command modules |
| No contracts | Contract PDF auto-generated per booking | ✅ | document module |
| Late-payment penalty | — | ❌ | Not in contract template |
| Opaque pricing | pricing-brain module (via AI tool) | 🟡 | Only AI has access — no UI |
| Discovery | Profile, search, gig-marketplace | ✅ | `/artist/profile`, `/gigs` |
| Rider management | **Just shipped UI** | ✅ | `/artist/rider` |
| Cash-only | Digital escrow + auto payouts | ✅ | payment module |
| Career invisibility | artist-intelligence + reputation + gamification | ✅ | `/artist/intelligence/*` |
| Agent commission splits | agent module + commission page | ✅ | `/agent/commissions` |
| Cancellation protection | emergency-substitution | ✅ | Backend + client-side UI |
| GST registration help | — | ❌ | Not tackled |
| Event-day disputes | **Just shipped event-day UI** | ✅ | `/artist/event-day/[bookingId]` |

---

## 5. Top 12 Remaining Gaps (prioritized)

### Tier A — Revenue-blocking or reputation-risking

1. **WhatsApp-native client + vendor comms** — No UI for the `whatsapp` API module. Biggest daily workflow pain in India. Opportunity: WhatsApp Business API integration, Zara-in-WhatsApp, auto-send proposal/contract/reminder to clients.
2. **Live subscription payments (Razorpay Subscriptions API)** — Currently only 14-day trial works; no paid-plan upgrade path. Blocks ₹1.5L MRR Sprint-3 goal.
3. **GST-compliant invoice PDFs for subscription + booking** — Invoice UI shipped but **backend `/v1/subscription/invoices` endpoint doesn't exist yet**. Must generate HSN codes, GSTIN of buyer/seller, IGST/CGST split.
4. **Client portal / shared workspace** — Client logs in, sees proposal, approves, pays, tracks event-day — all in one URL. Currently client-side is fragmented across `/client/bookings/*`.
5. **Late-payment penalty clause** in contract template — simple document.service change, huge artist-side trust win.

### Tier B — Differentiators / adjacencies

6. **Public pricing transparency** — `pricing-brain` should have a public `/pricing/artists/[type]/[city]` page. SEO moat + trust.
7. **Permit / regulatory helper** — Per-city checklist for weddings/concerts (police permit, entertainment tax, sound license). Zero incumbents do this.
8. **Travel + crew logistics for multi-city events** — Extend coordination module with a T-minus checklist UI. Already have backend.
9. **Review incentives** — Post-event auto-send review link via WhatsApp → completed bookings convert to reviews. Right now `review` UI exists but isn't prompted.
10. **Artist mobile app (PWA)** — Event-day page, rider, bookings, calendar on mobile. Currently responsive but not app-installable-first.

### Tier C — Long-term moat

11. **Insurance / cancellation protection product** — partner with ACKO/Digit for a ₹500/event add-on that covers no-show artists. Adjacent revenue stream.
12. **Recurring-client retention** — "Suggest re-booking artist X for your next annual day" using historical data. Nobody in India does this.

---

## 6. Recommended Next Build Plan (4-sprint / 8-week)

### Sprint 1 (Weeks 1–2) — Revenue + Compliance
- **W1**: `/v1/subscription/invoices` API + `/v1/subscription/checkout` (Razorpay Subscriptions, not just trial)
- **W1**: GST invoice PDF generator (document module) with HSN 998596, seller GSTIN from workspace metadata, CGST/SGST/IGST split
- **W2**: Razorpay webhook → auto-generate invoice on successful subscription payment
- **W2**: Late-payment penalty clause in booking contract template

### Sprint 2 (Weeks 3–4) — WhatsApp-native
- **W3**: WhatsApp Business API provider integration (Gupshup already in env vars)
- **W3**: Auto-send proposal PDF link, contract link, payment link, event-day reminders via WA
- **W4**: Planner-side WA inbox UI (embed inside workspace) — threaded by booking
- **W4**: Client "magic link" flow — approve proposal + pay without logging in, just WA OTP

### Sprint 3 (Weeks 5–6) — Client Portal + Reviews
- **W5**: Unified `/p/[token]` client portal: proposal → approve → pay → track → review — all in one URL, auth via WA OTP
- **W5**: Auto-send review request via WA 24hr after `completed` state
- **W6**: Public artist pricing pages `/pricing/[artist-type]/[city]` with JSON-LD schema for SEO

### Sprint 4 (Weeks 7–8) — Differentiators
- **W7**: Permit helper: per-city regulatory checklist (Mumbai, Delhi, Bangalore first)
- **W7**: Multi-city travel planner UI in coordination module
- **W8**: Cancellation insurance partner integration (ACKO API)
- **W8**: Artist PWA install prompts + push notifications for bookings

---

## 7. Confidence Levels & Caveats

| Claim | Confidence | Basis |
|---|---|---|
| Payment delay is the #1 artist pain | High | Multiple independent Indian sources |
| 18% GST is a real planner pain | High | ClearTax, KPMG, AuthBridge |
| 1-hr response → 3× more bookings | Medium | Single source (Aplos AI), US-centric but plausible |
| No Indian agency-OS competitor exists | High | India search returned only marketplaces (StarClinch etc.) |
| WhatsApp is planners' primary comm channel | High | Wappmaster, Gallabox, common knowledge |
| GRID covers 60% of pain today | Medium | Codebase audit is current; weighting is subjective |

**Caveats**: Data mostly from English-language web sources. Tier-2/3 city dynamics under-represented. No primary founder interviews conducted in this round — recommend 5–10 planner calls to validate Sprint 1 priority ordering.

---

## 8. Sources

### Industry + Pain Points
- [Strengths and Challenges of India's Event Industry — EVM Institute](https://evm.institute/basics-of-event-management/strengths-challenges-india-event-industry/)
- [KPMG — Elevating the event management landscape (2023)](https://assets.kpmg.com/content/dam/kpmg/in/pdf/2023/08/elevatin-the-event-management-landscape.pdf)
- [IBEF — Event Management in India: Rising Trends](https://www.ibef.org/blogs/understanding-the-surge-in-demand-for-event-management-in-india)
- [EEMA India](https://www.eemaindia.com/)
- [Are Payment Delays Silencing the Voices of Independent Music? — Indian Music Diaries](https://theindianmusicdiaries.com/are-payment-delays-silencing-the-voices-of-independent-music/)
- [Soundhammer — How to Ensure Timely Payments for Live Music Gigs](https://www.soundhammer.in/blogs/all/live-music-payments-guide)
- [iPleaders — How to draft a band performance agreement](https://blog.ipleaders.in/how-to-draft-a-band-performance-agreement/)
- [Indian Music Diaries — Signing Contracts: A Short Guide](https://theindianmusicdiaries.com/signing-contracts-a-short-guide-to-artist-rights-contract-clauses-and-more/)
- [Indian Music Diaries — India's Dire Lack of Live Venues](https://theindianmusicdiaries.com/things-to-reflect-upon-indias-dire-lack-of-live-venues/)

### GST + Legal
- [ClearTax — GST on Event Management Services](https://cleartax.in/s/gst-on-event-management)
- [AuthBridge — GST Guidelines for Event Management](https://authbridge.com/knowledge-centre/insights/gst-event-management-services)
- [TheTaxHeaven — GST Rate on Event Management Services in India](https://www.thetaxheaven.com/blog/applicability-of-gst-rate-on-event-management-services-in-india)

### Competitive + Workflow
- [Gigwell — Best Venue Booking Software 2025](https://www.gigwell.com/blog/best-venue-booking-software)
- [Gigwell vs Stagent comparison](https://www.gigwell.com/blog/gigwell-vs-stagent)
- [Stagent](https://stagent.com/)
- [Overture — Booking Agent Software](https://bookingwithoverture.com/)
- [Aplos AI — Event Planning Automation: 4 Workflows](https://aplosai.com/blog/event-planning-automation)
- [INSIDEA — 12 CRMs for Event Management](https://insidea.com/blog/hubspot/crms-for-event-management-companies/)

### India Artist Marketplace Context
- [StarClinch — Singer Booking Price List](https://starclinch.com/blog/singer-booking-price-list-india/)
- [VenueLook — Artist Categories And Prices In India](https://www.venuelook.com/costs/artist-categories-and-prices-in-india)
- [BlackHat Talent — Wedding Entertainment Guide](https://blackhattalent.com/blog/wedding-entertainment-how-to-choose-the-right-artists/)
- [BMT Agency — Cost of Booking a Popular Artist](https://bmtagency.in/how-much-does-it-cost-to-book-a-popular-artist-in-india/)
- [Hire4Event](https://www.hire4event.com/book-an-artist)

### WhatsApp + Payments
- [Gallabox — WhatsApp for Event Management](https://gallabox.com/blog/whatsapp-for-event-management)
- [WappMaster — Wedding Planning Apps 2026](https://wappmaster.app/best-wedding-planning-websites-and-apps-in-india-2026-guide/)
- [Razorpay Route — Split and distribute payments](https://razorpay.com/route/)
- [Razorpay Escrow Accounts](https://razorpay.com/x/escrow-accounts/)
- [Razorpay Settlements Docs](https://razorpay.com/docs/payments/settlements/)

---

## Next Step (per `/sc:research` boundaries)

This is a research report only. Proposed next actions for human decision:
1. **Validate**: 5–10 founder-led planner calls to confirm WhatsApp + GST invoice are Sprint 1.
2. **Design**: Invoke `/sc:design` for WhatsApp-native comms architecture.
3. **Build**: Invoke `/sc:implement` on Sprint 1 items once scope is locked.
