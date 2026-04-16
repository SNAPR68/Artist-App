# Slash for Events — Revised Product Requirements Document (PRD)

## Document Status
- Version: 2.0
- Date: 2026-03-28
- Audience: Founder, product, engineering, design, Codex
- Purpose: Upgrade the current ArtistBook platform into a decision-first event intelligence and transaction platform without discarding the existing monorepo, workflows, and operational modules.

## 1. Executive Summary
Slash for Events is not a generic artist discovery marketplace. It is the intelligence and operations layer for India’s live entertainment and event business.

The existing platform already includes deep infrastructure across booking, payments, pricing, recommendation, concierge, WhatsApp, voice, CRM, and artist intelligence. The revised product direction is to stop leading with broad marketplace discovery and instead lead with a decision-first workflow:

**event brief -> recommendation -> proposal -> assisted lock -> booking -> coordination -> event completion**

The immediate product wedge is a lightweight decision engine that helps planners, agencies, and event companies answer:
1. What should we book for this event?
2. What should it roughly cost?
3. What are the best-fit options given vibe, audience, risk, and timing?
4. Can we lock it quickly and run the workflow through one system?

## 2. Context and Current State
The current platform already has substantial coverage:
- Monorepo with Fastify API, Next.js frontend, shared package, migrations, E2E test surface, and deploy infrastructure.
- 36 backend modules and 237 endpoints.
- Existing modules for booking, pricing-brain, recommendation, concierge, WhatsApp, voice-query, payment, document generation, event coordination, and workspace CRM.
- Role support for artist, agent, client, event company, and admin.
- Existing branded Nocturne Hollywood design system.

This means the next product step is **not** a rebuild. It is a wedge refocus.

## 3. Problem Statement
The current market is fragmented and relationship-heavy.
- Planners and event companies lose time getting from brief to shortlist.
- Pricing is opaque and negotiated manually.
- Discovery surfaces are broad but not decisive.
- Booking workflows are known, but the actual bottleneck is choosing what to book quickly and confidently.
- Existing infrastructure is deeper than distribution.

### Core Problem
The product has enough system depth to execute bookings, but the top-of-funnel workflow is still heavier than the market wants. Users need a fast path from a chaotic brief to a decision they can act on.

## 4. Product Vision
Become the fastest and most trusted system in India for deciding what live entertainment should get booked for an event, and then running that transaction and operation through one stack.

## 5. Product Thesis
The market has four layers:
1. Demand: brands, families, planners, event companies
2. Supply: artists, agents, venues, vendors
3. Decision: what gets chosen, at what price, for what audience
4. Execution: contracts, riders, payment, logistics, event-day workflows

Most incumbents control demand or supply relationships. The wedge is to own the decision layer first and then expand into execution and transactions using already-built platform capabilities.

## 6. Goals
### 6.1 Business Goals
- Increase real brief volume processed through the platform.
- Make the platform the first stop for planners and event operators before they call their network.
- Convert recommendations into assisted bookings and transactions.
- Use every deal to improve pricing certainty, recommendation quality, and operational trust.

### 6.2 Product Goals
- Reduce time from event brief to shortlist from hours/days to under 2 minutes.
- Give users 3-5 ranked, explainable entertainment options with indicative price ranges.
- Generate proposal-ready output instantly.
- Support human-assisted lock and booking without forcing full self-serve automation.

### 6.3 Success Criteria
- Real briefs processed weekly grows consistently.
- Recommendation acceptance rate improves over time.
- Proposal generation to booking conversion becomes measurable and repeatable.
- Repeat usage from agencies and planners increases.

## 7. Non-Goals
These are explicitly not the current priority:
- Building a broad public marketplace with deep browse-first discovery.
- Redesigning all dashboards.
- Full autonomous booking without concierge support.
- Heavy investment in long-tail artist onboarding before demand flow is stronger.
- Adding more broad modules before the decision wedge is live.

## 8. Primary Users
### 8.1 Wedding Planner
Needs a fast answer to a client brief, often under deadline, and cares about crowd fit, family safety, language fit, and price confidence.

### 8.2 Corporate Event Agency
Needs brand-safe, reliable, operations-friendly recommendations for launches, awards, offsites, annual events, and activations.

### 8.3 Event Company / Workspace Team
Needs a repeatable internal decision workflow, proposal generation, booking pipeline visibility, and coordination after a deal closes.

### 8.4 Concierge / Founder / Deal Desk Operator
Needs to review recommendations, refine edge cases, lock pricing, and convert accepted recommendations into real bookings.

## 9. User Jobs to Be Done
### Wedding Planner
- When I receive a wedding entertainment brief, I want a shortlist with price bands and rationale quickly so I can respond to the family with confidence.

### Corporate Agency
- When I receive a brand event brief, I want recommendations that are operationally safe and relevant to audience and brand context.

### Event Company
- When my team is running multiple active opportunities, I want all briefs, proposals, and assisted locks visible in one operational workflow.

### Concierge Operator
- When a user wants to proceed, I want context-rich handoff data so I can lock availability, negotiate, and move the brief into the booking engine.

## 10. Product Scope
### 10.1 In Scope for This Revision
- Decision engine module
- Lightweight brief intake flow (web + WhatsApp + optional voice handoff)
- Ranked explainable recommendations
- Indicative price range generation
- Proposal generation from decision results
- Concierge handoff to booking flow
- Funnel analytics for the decision workflow

### 10.2 Existing Modules to Reuse
- `recommendation`
- `pricing-brain`
- `reputation-defense`
- `event-context`
- `shortlist`
- `document`
- `concierge`
- `booking`
- `notification`
- `analytics`
- `whatsapp`
- `voice-query`
- `workspace`

## 11. Core Experience
### 11.1 Brief Ingestion
User submits a natural-language or structured brief:
- event type
- city
- audience size
- budget
- vibe / genre
- family-safe / brand-safe constraints
- urgency
- format needed

### 11.2 Recommendation Output
System returns:
- top 3-5 recommendations
- indicative market range and expected close range
- why each fit is recommended
- risk flags
- recommended option
- confidence score

### 11.3 Decision Actions
User can:
- refine shortlist
- generate proposal
- lock availability
- talk to concierge

### 11.4 Handoff
Once user clicks lock or requests support, the platform creates a decision-to-booking handoff object and routes it into concierge + booking.

## 12. Functional Requirements
### FR1. Decision Brief API
The system must accept a structured or parsed brief and persist it as a first-class decision object.

### FR2. Natural Language Parsing
The system must parse raw brief text into structured fields using deterministic extraction and optional LLM/NLU augmentation.

### FR3. Ranking and Scoring
The system must return ranked recommendations using weighted scoring plus hard filters.

### FR4. Explainability
Each recommendation must include human-readable reasons, not only a score.

### FR5. Pricing Bands
Each recommendation must include price guidance with at least:
- market range
- expected close range
- notes if the brief is likely above/below realistic market fit

### FR6. Proposal Generation
The system must turn the brief and shortlisted recommendations into a branded proposal artifact using the existing document generation module.

### FR7. Assisted Lock
The system must let users request lock/availability, which creates a concierge handoff without requiring complete self-serve booking.

### FR8. Funnel Tracking
The system must log decision events through the funnel for conversion, quality, and pricing analysis.

### FR9. Workspace Visibility
Decision briefs and outcomes should be visible inside event-company workflows where relevant.

### FR10. Channel Parity
The same core decision flow must work across:
- web brief page
- WhatsApp
- internal concierge ops surface

## 13. Recommendation Logic
### 13.1 Hard Filters
Candidates may be removed if they fail any of:
- budget mismatch beyond acceptable threshold
- availability impossible
- family-safe / brand-safe mismatch
- rider / logistics impossibility
- reliability risk above threshold

### 13.2 Weighted Score
Initial scoring model:
- Event-type match: 25%
- Audience-vibe match: 20%
- Budget fit: 20%
- Reliability / completion history: 15%
- City / logistics fit: 10%
- Demand momentum / recency: 5%
- Strategic upside: 5%

### 13.3 Confidence Bands
- 85-100: high confidence
- 70-84: medium confidence
- 55-69: conditional fit
- below 55: fallback only

## 14. Data Model Additions
### 14.1 `decision_briefs`
Stores inbound briefs across channels.

Suggested fields:
- id
- source
- raw_text
- structured_brief (jsonb)
- created_by_user_id
- workspace_id nullable
- status
- created_at / updated_at

### 14.2 `decision_recommendations`
Stores scored recommendation output per brief.

Suggested fields:
- id
- brief_id
- artist_id
- score
- confidence
- price_min
- price_max
- expected_close
- reasons (jsonb)
- risk_flags (jsonb)
- rank

### 14.3 `decision_events`
Stores funnel events and instrumentation.

Suggested fields:
- id
- brief_id
- event_type
- payload (jsonb)
- created_at

## 15. API Surface
### POST `/decision-engine/parse`
Input: raw text brief
Output: structured brief candidate + missing required fields

### POST `/decision-engine/brief`
Input: structured brief
Output: persisted brief + ranked recommendations

### POST `/decision-engine/:briefId/proposal`
Input: brief id
Output: proposal artifact link / metadata

### POST `/decision-engine/:briefId/lock`
Input: brief id + selected recommendation
Output: concierge handoff / booking lead created

### GET `/decision-engine/:briefId`
Input: brief id
Output: current brief status and recommendations

## 16. UX Requirements
### 16.1 Web
One new public brief page with:
- one large natural-language input
- optional structured fields
- result cards
- proposal and lock CTAs

### 16.2 WhatsApp
Flow must be minimal:
1. receive brief
2. parse
3. ask at most one clarifying question if needed
4. return ranked options
5. offer quick replies

### 16.3 Voice
Voice should accelerate the same flow but not require a separate architecture.

## 17. Metrics
### Primary
- briefs created
- recommendation returned rate
- proposal generated rate
- lock requested rate
- booking created rate
- repeat brief rate per agency/workspace

### Secondary
- time to first recommendation
- shortlist acceptance rate
- close-price variance vs predicted price
- failure / replacement rate
- manual override rate from concierge

## 18. Risks
- Overfitting recommendation quality before enough transaction data exists
- Too much friction in first-use flow
- Under-specifying explainability, making output feel like generic AI
- Trying to automate negotiation before the assisted workflow is mature

## 19. Dependencies
- Existing recommendation and pricing services
- Existing document/PDF generation
- Existing concierge and booking flows
- Existing WhatsApp infrastructure and templates
- Shared package schemas and monorepo build pipeline

## 20. Rollout Plan
### Phase 1: Internal and founder-led
- Decision API
- Web brief page
- internal ops use

### Phase 2: Assisted external usage
- WhatsApp brief intake
- proposal generation
- concierge lock

### Phase 3: Agency workflow integration
- workspace visibility
- repeat brief management
- analytics dashboards for real deal flow

## 21. Acceptance Criteria
The revision is successful when:
- a planner can submit a brief and receive 3-5 ranked recommendations in under 2 minutes
- each recommendation includes pricing guidance and rationale
- proposal generation works from a brief without manual copy-paste
- lock requests create usable concierge/booking handoff objects
- engineering can ship this without restructuring the monorepo or replacing existing modules
