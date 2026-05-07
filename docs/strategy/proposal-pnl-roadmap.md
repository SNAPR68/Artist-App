# Proposal-with-P&L — Build Roadmap

_Created 2026-05-05. Owner: Claude. Status: in progress._

The new #1 build for GRID. Replaces the killed Lead-CRM-as-#1 after the
channel-reality pushback (ECs work inbound in WhatsApp, not in GRID — so
GRID's first real hook is the priced, branded, client-facing proposal
with internal P&L margin).

Decisions locked:
- PDF stack: `pdfkit` (codebase already standardized on it — overrode original `@react-pdf/renderer` pick to avoid new dep)
- Convert: line items copy into `boq_items` (not snapshot)
- Validity: auto `sent_at + 14 days`, editable
- Public URL: `grid.app/p/{token}` (no subdomain infra v1)

---

## Phase 0 — DB Schema ✅ COMPLETE (2026-05-05)

| # | File | Purpose |
|---|---|---|
| M1 | `20260505000115_create_proposals.ts` | Proposal rows, status machine, generated `margin_pct` |
| M2 | `20260505000116_create_proposal_line_items.ts` | Line items with `cost_paise` + `sell_paise` |
| M3 | `20260505000117_create_proposal_events.ts` | Append-only audit timeline |
| M4 | `20260505000118_event_files_add_source_proposal.ts` | `event_files.source_proposal_id` back-pointer |

---

## Phase 1 — API CRUD (Week 1) ✅ COMPLETE (2026-05-05)

Module path: `apps/api/src/modules/proposal/`

**Zod schemas** (`packages/shared/src/schemas/proposal.ts`):
- `CreateProposalSchema`, `UpdateProposalSchema`
- `CreateLineItemSchema`, `UpdateLineItemSchema`
- `ProposalStatusEnum`, `ProposalCategoryEnum`

**Routes (8) at `/v1/workspaces/:workspaceId/proposals`:**
1. `GET /` — list + filter (status, search by client/title) + paginate
2. `POST /` — create draft
3. `GET /:id` — full proposal + line items + recent events
4. `PATCH /:id` — update header (draft only for most fields)
5. `DELETE /:id` — soft-delete (draft only)
6. `POST /:id/line-items` — add
7. `PATCH /:id/line-items/:itemId` — update
8. `DELETE /:id/line-items/:itemId` — remove

**Shared helper:** `recomputeProposalTotals(proposalId)` — sum line items, write `total_cost_paise` + `total_sell_paise` back to `proposals` row. Called on every line-item write.

**RBAC:** `event_company` + `admin` roles only. Workspace-scoped check on every route.

---

## Phase 2 — Send / Version / Convert / PDF (Week 2) ✅ COMPLETE (2026-05-05)

**Routes (5) at `/v1/workspaces/:workspaceId/proposals/:id`:**
9. `POST /send` — generate `public_token` (crypto-random), set `status=sent`, default `valid_until = today + 14d` if NULL, log `sent` event, return shareable URL
10. `POST /version` — clone proposal + line items as v+1, status=draft, `parent_proposal_id` = current
11. `POST /convert-to-event-file` — create `event_files` row, copy line items into `boq_items`, set `event_files.source_proposal_id`, mark proposal `accepted` if not already, log `converted` event
12. `GET /pdf` — internal PDF (cost + margin shown)
13. `GET /summary` — P&L summary (totals, margin %, by-category breakdown)

**PDF templates** (`apps/api/src/modules/proposal/pdf/`):
- `InternalProposalPdf.tsx` — full P&L, cost + margin
- `ClientProposalPdf.tsx` — sell-only, branded GRID + EC workspace logo

---

## Phase 3 — Public Token API (Week 2) ✅ COMPLETE (2026-05-05)

**Routes (4) at `/v1/public/proposals/:token` (no auth):**
14. `GET /` — client-facing view (sell prices only, no cost/margin)
15. `POST /view` — log `viewed_at` (idempotent first view, captures IP/UA)
16. `POST /accept` — set `status=accepted`, capture client name + IP + UA + timestamp in `proposal_events.meta`
17. `POST /decline` — set `status=declined`, capture reason

**Rate limits:** 30 req/min per token (prevent abuse of public endpoints).

---

## Phase 4 — Web Pages (Week 3) ✅ COMPLETE (2026-05-05)

Module path: `apps/web/src/app/(dashboard)/event-company/proposals/`

1. `proposals/page.tsx` — list view: status pills, margin %, client, event date, search, "New Proposal" CTA, status tab filter
2. `proposals/new/page.tsx` — create flow: client + event basics → land on edit
3. `proposals/[id]/page.tsx` — editor:
   - Header: client + event basics (editable in draft, locked when sent)
   - Line-item table: category, description, qty, cost, sell, margin per row
   - Live totals + margin % at bottom
   - Sidebar: Send / New Version / Convert-to-Event-File buttons
   - Timeline panel: events feed
4. `proposals/[id]/preview/page.tsx` — internal preview of what client sees
5. `apps/web/src/app/p/[token]/page.tsx` — **public client page** (no login):
   - Branded, mobile-first
   - Sell prices + line items
   - Big Accept / Decline buttons
   - Captures view on mount
   - Auto-shows `valid_until` countdown

**Design:** Nocturne Hollywood tokens. `glass-card` for panels. `btn-nocturne-primary` for CTAs. No hardcoded colors.

---

## Phase 5 — Polish (Week 4) ⏳ IN PROGRESS (2026-05-05)

- ✅ WhatsApp send button: `wa.me/<phone>?text=<encoded URL>` deep link (in editor sidebar)
- ⏳ Email send button: `mailto:` fallback (real Resend integration deferred to v2)
- ✅ Hindi i18n strings: `proposal.*` keys in `apps/web/src/i18n/{en,hi}.json`
- ✅ Vercel lint pass — proposal pages pass `next lint` clean
- ✅ PostHog events: `proposal_created`, `proposal_sent`, `proposal_versioned`, `proposal_accepted`, `proposal_declined`, `proposal_converted` wired
- ✅ Cron for `expired` status — every 6h, flips sent/viewed past `valid_until` to expired (cron.ts job #25)
- ⏳ Manual QA matrix:
  - draft → send → public view (logs `viewed`) → accept → convert → event file appears with BOQ pre-filled
  - draft → send → decline → status terminal
  - send → version → original locked, v2 editable, parent chain visible
  - expire after `valid_until` (cron flips automatically)

---

## Open items (track inline, decide as we hit them)

- ✅ Cron for `expired` status — Phase 5 wired in cron.ts (every 6h).
- Email send (Resend) — deferred. Phase 5 ships `mailto:` only.
- E-signature — deferred. Accept-button + audit trail (IP/UA) is v1.
- WhatsApp template approval for "Proposal sent" notification — needs Interakt template draft. Phase 5.
- Multi-tenant logo on client PDF — workspace already has logo; wire it in Phase 2.

---

## Progress snapshot

| Phase | Status | % of sprint |
|---|---|---|
| 0 — DB schema | ✅ done | 15% |
| 1 — API CRUD | ✅ done | 25% |
| 2 — Send/version/convert/PDF | ✅ done | 25% |
| 3 — Public token API | ✅ done | 10% |
| 4 — Web pages | ✅ done | 20% |
| 5 — Polish | ⏳ in progress (~80%) | 5% |

---

## Working agreement
Per the user's directive on 2026-05-05: continue building autonomously through all phases. No "what next?" questions. Update this doc's progress snapshot + tick checkboxes after each phase lands.
