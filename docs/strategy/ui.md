# Slash for Events — UI / UX Specification

## Document Status
- Version: 2.0
- Date: 2026-03-28
- Purpose: Define the user interface and interaction model for the decision-first experience using the existing Nocturne Hollywood design system.

## 1. UX Strategy
The UI should not behave like a browse-heavy marketplace first. It should behave like a fast event brief compiler.

The first-use experience must answer one question quickly:
**Given this event, what should I book?**

This means the UI must optimize for:
- speed to first recommendation
- clarity of recommendations
- confidence and explainability
- low-friction handoff to a human-assisted booking flow

## 2. UX Principles
1. One brief in, one decision out.
2. Minimize navigation before value is shown.
3. Use structured output cards, not long chat transcripts.
4. Show confidence, price guidance, and fit reasons clearly.
5. Preserve the cinematic brand system but keep the decision experience operational, not ornamental.

## 3. Design System Baseline
Use the existing Nocturne Hollywood system:
- dark surfaces
- glass-card treatment
- purple as primary CTA accent
- cyan for data/intelligence highlights
- gold for confidence badges and ratings
- Manrope display + Inter body

Do not invent a second visual language.

## 4. Information Architecture
### 4.1 New Primary Entry Surface
**/brief**

This becomes the fastest front door for:
- planners
- agencies
- event companies
- founder-led demos

### 4.2 Existing Surfaces Reused
- workspace for internal team visibility
- concierge for assisted follow-up
- document/proposal pages where already present
- voice assistant entry points via Zara and Kabir

## 5. Core User Flows
### Flow A: Web Brief to Recommendation
1. User lands on `/brief`
2. User enters raw text or fills optional fields
3. User submits
4. System shows ranked recommendations
5. User clicks `Send proposal` or `Lock availability`
6. System transitions into assisted ops

### Flow B: WhatsApp Brief to Recommendation
1. User sends raw brief message
2. System parses
3. System asks at most one clarifying question if needed
4. System returns ranked cards in text form
5. User chooses quick reply action

### Flow C: Voice Brief to Recommendation
1. User speaks to Zara/Kabir
2. Speech is transcribed and parsed
3. System confirms brief in concise text
4. Recommendation cards appear in the UI
5. User can continue by text or CTA

## 6. `/brief` Page Specification
### 6.1 Layout
Use a simple, high-focus layout rather than full dashboard chrome.

#### Desktop
- Centered hero container
- Left/main: brief input and structured controls
- Right/secondary: trust signals, sample briefs, or quick tips
- Results appear below in a stacked card list or responsive grid

#### Mobile
- Single-column input-first flow
- Result cards stacked vertically
- Sticky bottom CTA tray only if needed

### 6.2 Page Sections
#### Section 1: Hero / Prompt Block
Content:
- Headline: direct and operational
- Subhead: explains the value in one line
- Primary textarea input
- Submit CTA

Suggested copy:
- Headline: `Describe your event.`
- Subhead: `Get the best-fit entertainment options, pricing bands, and a proposal-ready shortlist in minutes.`

#### Section 2: Optional Structured Inputs
Progressive disclosure beneath the free text input.
Fields:
- event type
- city
- audience size
- budget range
- vibe/genre
- format needed
- family-safe / brand-safe toggle
- urgency

These should not feel mandatory if the free text is strong.

#### Section 3: Results
Each recommendation card should include:
- artist / option name
- entertainment type
- confidence badge
- indicative range
- expected close range if known
- 3 short why-fit bullets
- risk flags if present
- CTA buttons

#### Section 4: Summary / Recommendation Header
Above the cards, show:
- brief summary
- platform recommendation
- high-level note if budget or constraints are tight

## 7. Recommendation Card Design
### 7.1 Card Content Model
Each card should have:
- top row: name, format, confidence badge
- price block: market range + expected close
- why-fit list: max 3 bullets
- risk block: only if applicable
- actions: `Send proposal`, `Lock this option`

### 7.2 Visual Priority
Order of prominence:
1. Recommendation relevance
2. Price guidance
3. Why fit
4. Action buttons
5. Risk notes

### 7.3 Badge System
- High confidence: gold or purple emphasis
- Medium confidence: cyan or neutral accent
- Low confidence: subdued, still legible

### 7.4 Card Rules
- Never exceed 3 why-fit bullets
- Never exceed 2 risk notes
- Avoid long paragraphs
- The card should remain decision-friendly at a glance

## 8. Proposal Action UX
### On Click: `Send proposal`
Behavior:
- if authenticated or contact-known: generate proposal immediately
- otherwise collect minimal contact detail inline or via modal
- show success state with proposal in progress / ready

Do not send users to a different complex workflow first.

## 9. Lock Action UX
### On Click: `Lock availability`
Behavior:
- create concierge handoff
- show a clear transition state:
  - `We’re checking availability and pricing.`
  - `A booking specialist will take this forward.`

The goal is confidence, not fake instant certainty.

## 10. WhatsApp UX Specification
### 10.1 Tone
Direct, concise, operational. No AI jargon.

### 10.2 Message Shape
#### User Input
`Delhi wedding 300 pax budget 6L Punjabi vibe`

#### System Output
- 1-line brief interpretation
- top 3 options
- one line per option with range + fit
- one recommended option
- quick replies

Example structure:
1. `Option A — 5L-7L — strong Punjabi wedding fit`
2. `Option B — 4L-6L — safer for mixed-age crowd`
3. `Option C — 3L-5L — best budget fit`

`Recommended: Option A if budget can stretch.`

Quick replies:
- Refine shortlist
- Send proposal
- Lock availability
- Talk to team

### 10.3 Clarifier Rule
If required info is missing, ask **one** question only.
Do not run a long bot form.

## 11. Voice UX Specification
### 11.1 Entry Point
Use Zara and Kabir as conversational accelerators.

### 11.2 Role
Voice is best for:
- demos
- first-touch experiences
- quick brief capture

Voice is not the only flow. The user should always see a structured text output after voice input.

### 11.3 Interaction Pattern
1. user speaks
2. system shows parsed brief summary
3. user confirms implicitly or edits via text
4. recommendations render as cards

## 12. Workspace UX Additions
Inside the event company workspace, add a new lightweight object:
- `Decision Briefs`

This view should show:
- brief summary
- owner
- created time
- status
- recommendation generated?
- proposal sent?
- lock requested?
- booking created?

This is useful for repeat internal workflows and deal desk operations.

## 13. States
### 13.1 Empty State
Prompt users with example briefs.
Examples:
- `Delhi wedding, 400 guests, Punjabi vibe, 8L budget`
- `Mumbai corporate annual day, 1,000 pax, high-energy host + singer`

### 13.2 Loading State
Use skeleton cards, not spinners only.
Show semantic progress copy such as:
- `Reading your brief`
- `Matching entertainment options`
- `Estimating pricing`

### 13.3 No Strong Match State
If no strong matches exist, say so directly and offer:
- broaden budget
- refine vibe
- talk to concierge

### 13.4 Error State
Clear and operational.
Example:
`We couldn't process this brief right now. Try again or talk to our team.`

## 14. Accessibility and Usability
- All key CTAs must be keyboard accessible
- mobile layout must preserve readability of pricing and rationale
- voice experience must have a full text fallback
- contrast must remain compliant within the dark theme
- avoid relying only on color for confidence or risk

## 15. Component Inventory
### New components
- `DecisionBriefInput`
- `DecisionStructuredFields`
- `DecisionSummary`
- `RecommendationCard`
- `ConfidenceBadge`
- `PriceRangeBlock`
- `RiskFlagList`
- `DecisionActionBar`
- `ProposalSuccessState`
- `LockHandoffState`

### Reused components
- glass-card wrappers
- buttons
- chips/badges
- modals
- tables inside workspace
- existing voice assistant shell where relevant

## 16. Copy Guidelines
Tone should be:
- human
- confident
- direct
- Indian-market appropriate

Avoid:
- generic AI phrases
- exaggerated claims
- placeholder copy
- long descriptions where short bullets work better

## 17. Sample Screen Structure
### Brief page
- headline
- subhead
- free text input
- optional structured fields accordion
- generate button
- result summary
- 3 recommendation cards
- footer action area

### Workspace list page
- page title
- filters: all / proposal sent / locked / booked
- decision brief table
- click into detail panel

### Decision detail view
- brief summary
- recommendation stack
- selected recommendation
- proposal history
- concierge notes
- booking status

## 18. UI Success Criteria
The UI is successful if:
- a first-time user can understand the value proposition without onboarding
- a planner can get to 3 ranked options quickly
- recommendation cards are understandable in under 10 seconds each
- proposal and lock actions feel like natural next steps
- the experience feels premium, not cluttered

## 19. UI Anti-Patterns to Avoid
- browse-heavy grid before intent capture
- multi-step setup before showing results
- long conversational transcripts instead of structured decisions
- overdesigned motion that slows the workflow
- exposing too many data points before core value is shown
