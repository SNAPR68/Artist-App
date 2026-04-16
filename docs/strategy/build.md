# Slash for Events — Build Plan

## Document Status
- Version: 2.0
- Date: 2026-03-28
- Purpose: Give engineering and Codex a concrete implementation plan for shipping the decision-first wedge on top of the current platform.

## 1. Build Goal
Ship a production-usable decision workflow on top of the existing ArtistBook monorepo:

**brief -> recommendation -> proposal -> concierge handoff -> booking**

Do this without broad refactors or unnecessary new surface area.

## 2. Constraints and Assumptions
- The monorepo, module system, and deployment stack remain unchanged.
- Shared package must build before API and web builds.
- API remains Fastify + TypeScript + Knex.
- Web remains Next.js App Router + Tailwind.
- Existing modules should be reused rather than rewritten.
- The first iteration should be channel-light and conversion-heavy.

## 3. Deliverables
### Required
- new `decision-engine` backend module
- shared schemas and types
- 3 new DB tables + migrations
- web brief page
- WhatsApp flow integration
- proposal generation endpoint
- concierge lock handoff endpoint
- analytics instrumentation
- tests for critical path

### Optional in this cycle
- workspace decision briefs list
- voice-path enhancements
- feature flag for staged rollout

## 4. Repository Touchpoints
### Backend
```txt
apps/api/src/modules/decision-engine/
apps/api/src/app.ts or module registry file(s)
```

### Shared
```txt
packages/shared/src/decision-engine.ts
packages/shared/src/index.ts
```

### Database
```txt
packages/db/migrations/
```

### Frontend
```txt
apps/web/src/app/brief/page.tsx
apps/web/src/components/decision/
apps/web/src/lib/api/decision-engine.ts
```

### WhatsApp integration
```txt
apps/api/src/modules/whatsapp/
```

### Proposal integration
```txt
apps/api/src/modules/document/
```

## 5. Proposed Backend Module Structure
```txt
apps/api/src/modules/decision-engine/
  decision-engine.module.ts
  decision-engine.controller.ts
  decision-engine.service.ts
  decision-engine.repository.ts
  decision-engine.schemas.ts
  decision-engine.types.ts
  decision-engine.utils.ts
```

### Responsibilities
- parse and validate briefs
- persist briefs
- orchestrate candidate ranking
- persist recommendation output
- invoke proposal generation
- create lock handoff objects
- emit analytics

## 6. Shared Types and Schemas
Create `packages/shared/src/decision-engine.ts`.

Required exports:
- `DecisionBriefSchema`
- `DecisionParsedBriefSchema`
- `DecisionRecommendationSchema`
- `DecisionResponseSchema`
- `DecisionProposalRequestSchema`
- `DecisionLockRequestSchema`
- type aliases inferred from schemas

### Important
Because the repo is ESM throughout, keep source imports compatible with the existing conventions and ensure the shared package is built before API or web type consumers.

## 7. Database Migrations
Add one migration file for the initial decision-engine data model.

### Table 1: `decision_briefs`
Suggested columns:
- id uuid pk default gen_random_uuid()
- source text not null
- raw_text text null
- structured_brief jsonb not null
- status text not null default 'new'
- created_by_user_id uuid null
- workspace_id uuid null
- selected_recommendation_id uuid null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### Table 2: `decision_recommendations`
Suggested columns:
- id uuid pk default gen_random_uuid()
- brief_id uuid not null references decision_briefs(id) on delete cascade
- artist_id uuid not null references artists(id)
- score numeric(5,2) not null
- confidence text not null
- price_min numeric(12,2) not null
- price_max numeric(12,2) not null
- expected_close numeric(12,2) null
- reasons jsonb not null default '[]'
- risk_flags jsonb not null default '[]'
- logistics_flags jsonb not null default '[]'
- rank int not null
- created_at timestamptz not null default now()

### Table 3: `decision_events`
Suggested columns:
- id uuid pk default gen_random_uuid()
- brief_id uuid not null references decision_briefs(id) on delete cascade
- event_type text not null
- payload jsonb not null default '{}'
- created_at timestamptz not null default now()

## 8. API Endpoints to Implement
### POST `/decision-engine/parse`
Purpose: raw text -> structured brief candidate

### POST `/decision-engine/brief`
Purpose: create brief + compute recommendations

### GET `/decision-engine/:briefId`
Purpose: fetch brief + recommendations

### POST `/decision-engine/:briefId/proposal`
Purpose: generate proposal using current brief context

### POST `/decision-engine/:briefId/lock`
Purpose: create concierge handoff using selected recommendation

## 9. Recommendation Implementation Plan
### Step 1: Candidate set
Use the current recommendation/search stack to gather a relevant candidate pool.

### Step 2: Enrichment
For each candidate, enrich with:
- pricing range
- reliability/risk
- event-type fit
- audience/vibe fit
- availability signal
- city/logistics fit
- rider/venue fit if possible

### Step 3: Hard filters
Exclude candidates that fail:
- impossible availability
- budget mismatch beyond threshold
- family-safe / brand-safe mismatch
- severe reliability issue
- hard logistics impossibility

### Step 4: Score
Use a weighted score:
- event-type match 25
- audience-vibe match 20
- budget fit 20
- reliability 15
- logistics/city fit 10
- momentum 5
- strategic upside 5

### Step 5: Explainability
Generate:
- `whyFit[]`
- `riskFlags[]`
- `logisticsFlags[]`

### Step 6: Persist
Store the brief, ranked recommendations, and an event log.

## 10. Proposal Generation Plan
Do not build a new PDF engine.
Reuse the existing document module.

### Proposal payload should include
- event summary
- recommendation summary
- top 3-5 options
- indicative price bands
- rationale and risk notes
- selected recommendation if available

### Output
- proposal file metadata
- reference stored against the brief and/or downstream booking object

## 11. Lock / Concierge Handoff Plan
### On `lock`
Create a handoff object containing:
- brief id
- selected recommendation id
- structured brief
- recommendation snapshot
- price guidance
- originating channel
- any contact/workspace context

Then pass that into the existing concierge flow.

Do not automate negotiation in this cycle.
Use human-assisted escalation.

## 12. Web Build Plan
### New page
`apps/web/src/app/brief/page.tsx`

### New components
```txt
apps/web/src/components/decision/
  DecisionBriefInput.tsx
  DecisionStructuredFields.tsx
  DecisionSummary.tsx
  RecommendationCard.tsx
  ConfidenceBadge.tsx
  PriceRangeBlock.tsx
  DecisionActionBar.tsx
```

### Page behavior
- accept free text and optional fields
- call parse or brief endpoint
- render recommendation cards
- trigger proposal and lock actions
- show success/error/loading states

### Reuse
Use existing glass-card and button utility classes from the Nocturne design system.

## 13. WhatsApp Build Plan
Integrate into the current WhatsApp conversation state machine.

### New intent
`CREATE_BRIEF`

### Flow
1. detect event brief intent
2. call `/decision-engine/parse`
3. if one critical field missing, ask one clarifier
4. call `/decision-engine/brief`
5. send top 3 options
6. offer quick replies for proposal / lock / refine

### Rules
- do not ask long sequential forms
- keep messages compact
- store originating message in `decision_briefs.raw_text`

## 14. Voice Build Plan
No separate backend module required.

### What to do
- reuse voice-query routing
- map qualifying intents into parse/brief creation
- always render structured output after voice capture

This is optional for the first shipping milestone, unless demo value is critical.

## 15. Analytics and Event Logging
### Product analytics
Emit:
- `brief_created`
- `brief_parse_failed`
- `recommendation_returned`
- `proposal_generated`
- `lock_requested`
- `booking_created`
- `brief_dropped`

### Relational logging
Also persist in `decision_events` so data survives client analytics drift.

## 16. Testing Plan
### Unit tests
- brief schema validation
- parser normalization
- hard filter logic
- scoring math
- confidence mapping

### Integration tests
- create brief endpoint
- proposal generation endpoint
- lock handoff endpoint
- WhatsApp intent path

### Smoke tests
- build shared package
- typecheck api/web consumers
- generate one proposal end-to-end in staging

## 17. Rollout Strategy
### Stage 1: Internal only
- founder and ops use `/brief`
- manual QA on scoring and proposal payloads

### Stage 2: Assisted external users
- a few agencies or planners use WhatsApp and web brief flows
- lock action remains human-assisted

### Stage 3: Workflow expansion
- workspace visibility
- repeat briefs
- richer analytics and ranking refinement

## 18. Day-by-Day Build Schedule
### Day 1
- add shared schemas
- add DB migration
- scaffold backend module

### Day 2
- implement parse flow
- implement candidate enrichment interfaces
- wire recommendation + pricing + reputation services

### Day 3
- implement ranking logic and persistence
- add `/decision-engine/brief`
- emit analytics events

### Day 4
- add proposal endpoint using document module
- add lock endpoint using concierge module

### Day 5
- build `/brief` page and recommendation cards
- hook proposal + lock actions

### Day 6
- wire WhatsApp flow
- implement quick replies and event logging

### Day 7
- run tests
- deploy to staging/production
- process real briefs through the system

## 19. Commands and Build Notes
### Local development
```bash
pnpm install
pnpm --filter @artist-booking/shared build
pnpm --filter @artist-booking/api dev
pnpm --filter @artist-booking/web dev
```

### Validation
```bash
pnpm turbo typecheck
pnpm turbo test
pnpm turbo lint
```

### Important repo-specific notes
- shared package must build first
- ESM import compatibility matters
- do not break `tsconfig.build.json` assumptions for API compile
- keep Vercel/Render env compatibility intact

## 20. Definition of Done
This build is done when:
- a real event brief can be submitted via web and WhatsApp
- ranked recommendations are returned with price guidance and rationale
- a proposal can be generated from the brief
- a lock request creates a usable concierge handoff
- analytics events are emitted through the new funnel
- the system is usable in live founder-led or ops-led sales conversations

## 21. Explicit Deprioritization
Not for this sprint:
- broad new dashboard redesigns
- public long-tail marketplace expansion
- autonomous negotiation logic
- major DB redesign outside the decision data model
- extensive voice-only branching logic

## 22. Recommended First Engineering Owner Split
### Backend owner
- schemas, migrations, decision-engine module, proposal/lock endpoints

### Frontend owner
- `/brief` page, result cards, success/error/loading states

### Ops / founder owner
- prompt examples, recommendation QA, test briefs, concierge workflow tuning

## 23. Final Implementation Note
The most important mistake to avoid is treating this like a net-new marketplace build. It is an orchestration layer on top of a system that already has booking, pricing, concierge, document, payment, and coordination depth. Keep the implementation small, channel-aware, and conversion-focused.
