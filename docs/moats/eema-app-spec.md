# EEMA App — Product Spec

_Moat #5: Institutional capture. GRID becomes the official tech partner of the Event & Entertainment Management Association of India (EEMA)._

## Strategic intent

EEMA is the trade body for India's event industry (~500 member agencies). Becoming their official platform means:
- Every new EEMA member onboards to GRID by default.
- Disputes between members route through GRID's dispute module.
- EEMA member directory = GRID agency directory (indexed, searchable, signed).
- Industry KPIs (bookings closed, GMV, on-time %) are sourced from GRID.

Competing agency platforms would need to displace an institution, not just a vendor.

## Scope (v1 — 90 days)

### 1. EEMA member dashboard
- Badge: "EEMA Verified" — signed by EEMA + GRID key.
- Member-only filters in search (clients can pick "EEMA members only").
- Public member card at `/eema/:memberId` — trust score, bookings, years active.

### 2. Dispute routing
- Any dispute where BOTH parties are EEMA members auto-routes to EEMA's arbitration committee.
- GRID hosts the evidence locker + decision record.
- EEMA committee gets a review queue in their dashboard.

### 3. Industry analytics (EEMA-branded)
- Monthly report: total GMV across EEMA members, avg deal size, top categories, city breakdown.
- Export as branded PDF, co-signed GRID + EEMA.
- Available only to EEMA board + paying members.

### 4. Membership issuance / renewal
- EEMA issues membership inside GRID admin.
- Payment → Razorpay → GRID fee split 80/20 (EEMA/GRID).
- Auto-renewal, lapse warnings, revocation flow.

### 5. Event calendar (industry-wide)
- EEMA members publish upcoming events.
- Others see "EEMA-affiliated events" — helps vendor/supplier matching.

## Out of scope (v1)
- Non-agency memberships (venues, vendors) — phase 2.
- International chapters — phase 3.
- Accreditation exams — phase 4.

## Commercial structure
- GRID charges EEMA ₹0 for the platform.
- GRID keeps 20% of membership fees collected via platform (₹2–5K per member per year).
- GRID gets exclusive "Official Tech Partner" branding on EEMA website + events.
- EEMA gets co-marketing at GRID-sponsored industry events.

## Success metrics (12 months)
- ≥ 80% of EEMA active members onboarded to GRID.
- ≥ 50% of inter-member disputes routed through GRID dispute module.
- EEMA-branded monthly report published consistently.
- ≥ ₹10L in membership fees collected via platform.

## Pitch to EEMA board

Subject: Making EEMA the digital center of India's event industry

EEMA's biggest asset is trust — the badge members earn. Right now that badge lives on LinkedIn profiles and office walls. We can make it live in every booking, every invoice, every dispute — where it actually matters commercially.

GRID will build EEMA a members-only operating platform at zero cost. Your members get booking tools, dispute resolution, signed verification. EEMA gets:
- 20% of platform-collected membership fees (new revenue line).
- The industry's only source-of-truth analytics (which makes EEMA the body the press calls).
- A moat — any agency leaving EEMA loses the badge, the dispute committee, and the analytics access.

We're not asking for exclusivity on your members' software choices. We're asking to be the default. Members can use whatever they want for marketing or accounting — but for bookings, disputes, and industry data, the path of least resistance should run through an EEMA-branded platform.

Ask: 30-minute pitch to the board, 1 pilot quarter with 20 member agencies, then full rollout if metrics hit.

## Implementation phases

**Phase 0 — Partnership (weeks 1-4)**
- Pitch, term sheet, MOU signed.

**Phase 1 — Member onboarding (weeks 5-10)**
- Member dashboard, EEMA verified badge, member directory.

**Phase 2 — Dispute + analytics (weeks 11-16)**
- Dispute routing, monthly report generator, committee review queue.

**Phase 3 — Membership CRM (weeks 17-20)**
- Issuance, renewal, payments, revocation.

**Phase 4 — Launch (week 21)**
- Joint press release, EEMA AGM demo, full member migration.
