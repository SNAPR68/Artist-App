# GRID — CLAUDE.md
_Last updated: 2026-05-05_

## ACTIVE BUILD: Proposal-with-P&L (sprint #1)

After the gap report (2026-04-30) and the channel-reality pushback that killed Lead-CRM-as-#1 (ECs work inbound in WhatsApp, not in GRID), the current build is **Proposal-with-P&L** — GRID's first inbound surface where the EC has actual reason to leave WhatsApp and open GRID.

Roadmap: `docs/strategy/proposal-pnl-roadmap.md` — phase-wise build plan, progress tracked there.

Working agreement: Claude proceeds autonomously through phases. No "what next?" questions. Update roadmap progress snapshot after each phase lands.

Current phase: **Phase 1 — API CRUD** (Phase 0 DB schema ✅ done 2026-05-05).

---

## CURRENT STATE: Event Company OS, code-complete, pre-revenue

GRID is the **Event Company Operating System** — one event file covering all vendors, crew, client, call sheets, day-of ops. Pivoted from "artist booking with voice" on 2026-04-22.

**Channels:** WhatsApp + Email only. **SMS / MSG91 / DLT is OUT — do not re-introduce.** Outbound voice calls REMOVED 2026-04-23 (treat existing outbound-voice code as dead).

**Primary EC interface:** Event companies talk to GRID's official WhatsApp number (Interakt BSP, shared) via text or voice notes. GRID parses intent, executes actions (call sheet, BOQ, rider, confirmations, check-ins), replies on WhatsApp. They do NOT log in for routine ops. Voice notes transcribed via OpenAI Whisper (`whisper-1`, language `hi` for Hinglish).

**Categories (5):** `artist | av | photo | decor | license` (Model A: license agents as vendors). **AV = bundled** sound+lights+stage. Sprint D wk1 add-on: `promoters | transport`.

**Cut from MVP (permanent):** inbound voice / public phone number, caterer category, venue, managed license service, financial reconciliation, live ROS editor, crew voice polling, post-event debrief calls, venue RFP/BEO, guest RSVP, mood boards, marketing pipeline.

**Pricing:** free pilots first, no pricing until post-pilot. Target: 10 paying agencies @ ₹15K/mo = ₹1.5L MRR.

**Strategic shortcut:** Don't refactor `artist_profiles` → polymorphic `vendors` now. Add `category` column. UI shows "vendors" umbrella. Refactor month 3+ when paying customers force it.

**Strategy docs:**
```
docs/strategy/prd.md                    — What & why (Part 2 = Event Company OS expansion)
docs/strategy/sprint-final.md           — Latest sprint plan
docs/strategy/system-architecture.md    — Technical architecture
docs/strategy/ui.md                     — UI/UX spec
```

---

## CRITICAL RULES (read before doing anything)

1. **Read MEMORY.md first** — project state, feedback rules, references. Don't re-explore.
2. **Delegate heavy reads to sub-agents** — never read files >100 lines into main context. Use Agent(subagent_type="Explore") for codebase exploration, Agent(subagent_type="Plan") for design.
3. **Targeted edits only in main context** — read specific line ranges (offset+limit), edit, commit, deploy.
4. **Never claim "done" without verifying** — DB → API → frontend render chain, end-to-end. Production curl + visible render.
5. **Production DB migrations** — run via Supabase SQL Editor (no direct DB_URL). Generate raw SQL.
6. **Token efficiency** — be terse, no preamble, no recap. Default effort low. Show only changed code.
7. **No SMS / no MSG91 / no DLT / no outbound voice.** Channels = WhatsApp + Email.

---

## Project Overview
India's live entertainment Event Company OS. Monorepo: Fastify API, Next.js frontend, shared packages. ~108 migrations, 38 API modules, 250+ endpoints, 23 cron jobs, 50+ frontend pages.

## Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22 |
| Language | TypeScript | 5.5 |
| Package Manager | pnpm | 9.15.4 |
| Monorepo | Turborepo | 2 |
| Backend | Fastify | 5 |
| ORM / Query | Knex | 3.1 |
| Frontend | Next.js (App Router) | 14 |
| UI Framework | React | 18.3 |
| Styling | Tailwind CSS | 3.4 |

## Monorepo Structure
```
apps/api/          — Fastify REST API
apps/web/          — Next.js 14 frontend
packages/shared/   — Zod validators, enums, types, constants
packages/ui/       — Shared React components
packages/db/       — Knex migrations + seeds
infrastructure/    — Docker, deploy configs
e2e/               — End-to-end tests (incl. k6 load)
```

## Deployment
| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | `https://artist-booking-web.vercel.app` |
| API | Render (paid tier) | `https://artist-booking-api.onrender.com` |
| Database | Supabase (Sydney) | `wqfzlkkkcsjrwksjpxfp.supabase.co` |
| Redis | Upstash | env vars on Render |
| Repo | GitHub | `SNAPR68/Artist-App` |

## Build Commands
```bash
# Local dev
pnpm install
pnpm --filter @artist-booking/shared build   # MUST build shared first
pnpm --filter @artist-booking/api dev
pnpm --filter @artist-booking/web dev

# Production build — API (Render)
pnpm --filter @artist-booking/shared build
cd apps/api && npx tsc -p tsconfig.build.json && npx tsc-alias -p tsconfig.build.json
node dist/app.js

# Production build — Web (Vercel)
pnpm turbo build --filter=@artist-booking/web
```

## Architecture Decisions
- **ESM throughout** — `"type": "module"`, `.js` extensions in source imports
- **Path aliases** — `@/*` → `./src/*`, resolved by `tsc-alias` for API builds
- **`@artist-booking/shared`** — pnpm workspace dep, stays as bare specifier in API output
- **`tsconfig.build.json`** — relaxed (strict: false) for API builds, separate from dev
- **SSL required** — Supabase pooler needs SSL in `database.ts`
- **Session pooler** — IPv4-compatible shared session pooler (NOT direct connection) for Render

## Environment Variables

### Render (API)
**Core:**
- `DATABASE_URL` — Supabase session pooler URL (`%40` for `@` in password)
- `REDIS_URL` — Upstash Redis URL
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `PII_ENCRYPTION_KEY` — 32+ char AES-256-GCM key
- `NODE_ENV=production`, `PORT=3001`, `LOG_LEVEL=info`

**WhatsApp (Interakt):**
- `WHATSAPP_PROVIDER=interakt` (or `stub` for dev)
- `WHATSAPP_API_KEY` — Interakt API key (Basic auth)
- `WHATSAPP_WEBHOOK_SECRET` — Interakt webhook secret
- `WHATSAPP_FROM_NUMBER` — registered Interakt number (e.g. `919XXXXXXXXX`)

**OpenAI:**
- `OPENAI_API_KEY` — Whisper transcription (+ future LLM)

**Optional:**
- `RESEND_API_KEY`, `EMAIL_FROM` — email delivery
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `ELEVENLABS_API_KEY` — voice TTS (graceful fallback)
- `SENTRY_DSN`, `POSTHOG_*`

### Vercel (Web)
- `NEXT_PUBLIC_API_URL` — Render API URL
- `NEXT_PUBLIC_SUPABASE_URL`
- `ENABLE_EXPERIMENTAL_COREPACK=1` — pnpm on Vercel
- `ELEVENLABS_API_KEY` — server-side TTS proxy

## Common Issues
1. **Shared not emitting `dist/`** — delete `packages/shared/tsconfig.tsbuildinfo`
2. **`@artist-booking/shared` not found at API build** — build shared first
3. **DB connection error on Render** — must use Supabase session pooler, password `@` → `%40`
4. **Vercel build fails** — root dir blank, build cmd `pnpm turbo build --filter=@artist-booking/web`, output `apps/web/.next`
5. **CORS errors** — whitelist Vercel origin in Fastify CORS in `app.ts`
6. **Vercel lint gate** — `apps/web` build fails on any ESLint error. Run lint before push.

## Module Inventory (38 modules)
admin, agent, analytics, artist, artist-intelligence, auth, booking, calendar, client, concierge, coordination, decision-engine, dispute, document, dynamic-pricing, emergency-substitution, event-context, event-day, event-files (Event File OS), financial-command, gamification, gig-marketplace, media, notification, payment, pricing-brain, recommendation, reputation-defense, review, rider, search, seasonal-demand, shortlist, social-analyzer, venue, voice-query, **whatsapp** (incl. EC bot + Whisper), workspace.

## RBAC
92 permissions, 5 roles: `artist | agent | client | event_company | admin`.

## Middleware (6)
`auth | error-handler | rate-limiter | rbac | request-logger | validation`

---

## Design System: Nocturne Hollywood (dark glassmorphism)

**Brand: GRID** (NOT ArtistBook, NOT Nocturne Elite — those are stale codenames). Voice: human, direct, Indian market. No AI jargon, no placeholder copy.

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-[#0e0e0f]` | Obsidian | Page bg |
| `bg-[#1a191b]` / `#1a1a1d` | Surface | Card bg |
| `bg-[#201f21]` | Surface high | Elevated panels |
| `bg-[#262627]` | Surface highest | Deep containers |
| `bg-[#2c2c2d]` | Surface bright | Hover |
| `text-[#c39bff]` / `#8A2BE2` | Primary purple | CTAs, brand |
| `text-[#a1faff]` | Cyan | AI/data labels |
| `text-[#ffbf00]` | Gold | Ratings, badges |
| `text-white/50,30` | — | Secondary/muted |
| `border-white/5,10` | — | Subtle/standard borders |

### Typography
- Display: `font-display` (Manrope) — headlines
- Body: `font-sans` (Inter)
- Headlines: `font-extrabold tracking-tighter`
- Labels: `text-xs tracking-widest uppercase font-bold`

### Layout patterns
- **Bento Hero**: `grid grid-cols-1 md:grid-cols-12 gap-6` (8+4)
- **Glass Card**: `glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden`
- **Ambient Glow**: `<div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />`
- **Onboarding**: 5+7 split with radial gradient bg
- **Artist Profile**: aspect-[21/9] cover + 8+4 tabs + sticky booking card

### CSS utilities (`apps/web/src/styles/globals.css`)
`glass-card`, `glass-panel`, `glass-floating`, `btn-nocturne-{primary,secondary,accent}`, `input-nocturne`, `badge-nocturne`, `nocturne-chip`, `nocturne-divider`, `nocturne-table`, `text-gradient-nocturne`, `nocturne-nav-item{,-active}`, `stage-glow-{violet,cyan}`, `inner-glow-{status,success,warning,error}`, `nocturne-skeleton`, `nocturne-overlay`.

### Frontend rules (global)
- Check design system before writing UI (shadcn, figma, existing components)
- Never hardcode colors/spacing/font sizes — use tokens / Tailwind
- Prefer existing components; grep for similar before creating new
- Tailwind utilities over inline `style={{}}` (only for dynamic values)
- Mobile-first responsive: `sm: → md: → lg:`
- Zero light-theme classes (exception: `presentations/[slug]` for print)

---

## Current Build Status (2026-05-03)

### Code-complete & deployed
- **Event File OS**: 5-tab dashboard (Roster | Call Sheets | Rider | BOQ | Day-of), add/remove vendors, rider generate, BOQ UI, demo proxy downloads
- **WhatsApp EC bot**: voice notes via Whisper, EC intents (call sheet, roster status, confirmations, check-ins, BOQ, rider, list events), event disambiguation with numbered list, conversation state machine
- **WhatsApp provider abstraction**: `stub` (dev) | `interakt` (prod). Webhook signature verification (HMAC-SHA256). Auto-routes EC users → EC bot, others → marketplace bot
- **Day-of**: manual vendor status override, confirmation/check-in chips
- **Demo data**: 80 vendors + 3 demo event files seeded; downloadable call sheet, rider, BOQ
- **Auth**: OTP login (with bypass code `123456` in dev/staging), JWT 1h access / 30d refresh
- **Voice (Zara/Kabir)**: 3D mascots, ElevenLabs TTS via `/api/tts` Next route, Web Speech API mic, 6 intents, 40+ page targets, Hinglish
- **Payments**: Razorpay integration, escrow (8 states), idempotency with FOR UPDATE, refunds, webhooks
- **Search**: 100 seeded artists + 80 vendors, full-text + filters
- **Observability**: PostHog live, Sentry DSN-gated, Firebase push
- **Security**: XSS sanitization, body size limits (1MB / 10MB media), rate limits (OTP 5/hr, payments 10/min), webhook signing
- **Infrastructure**: Redis caching (search 2m, profiles 5m, homepage 10m), 30s query timeout, slow query log >1s, post-deploy smoke tests
- **PWA**: 7 brand-purple icons, manifest with Nocturne theme

### Pre-revenue blockers (manual, not code)
| Item | Status | Days |
|---|---|---|
| Meta app review (IG OAuth) | not submitted | 7–14 |
| Razorpay live KYC | mock mode | 5 |
| Interakt WABA + 5 templates approved | not signed up | 3 |
| Resend (email) credentials | missing | 0.5 |
| Lawyer review of privacy/terms/pilot | not engaged | 3–5 |
| `OPENAI_API_KEY` on Render | local only | 0.5 |
| Pilot agencies recruited | 0 of 3 | parallel |

**Realistic first paid customer:** ~5–6 weeks (3 weeks setup + 2–3 weeks free pilot).

### Deferred / nice-to-have
- BetterStack uptime monitoring
- Log drain
- k6 load test execution (file exists at `e2e/tests/load/demo.k6.ts`)

---

## Seed Data
- 100 artist profiles, 80 vendors across 5 categories, 3 demo event files
- 10 cities, realistic data (DJ, Singer, Band, Comedian, Dancer + AV/photo/decor/license vendors)
- OTP bypass: `OTP_BYPASS_ENABLED=true`, code `123456` (dev/staging only)

---

## Platform Thesis
Not a booking marketplace. The **operating system** for India's live entertainment industry. Demand → Supply → **Decision** → **Execution**. We own decision + execution.

Moat (3 layers):
1. Decision intelligence — every brief→recommendation→booking improves pricing, ranking, trust
2. Reputation/career infrastructure that can't be ported
3. Operational workflow replacement (booking, coordination, payment, escrow, day-of) that makes leaving expensive

### Decision engine flow
```
brief (web/WhatsApp/voice) → parse → rank → recommendations
  → proposal PDF → lock availability → concierge handoff → booking
```

### Entry surfaces
- `/brief` — public decision page
- WhatsApp `CREATE_BRIEF` (artist marketplace) + EC bot (event_company role)
- Voice (Zara/Kabir)
- Concierge ops — internal deal desk

---

## Testing
```bash
pnpm turbo test          # vitest
pnpm turbo typecheck
pnpm turbo lint          # MUST pass — Vercel build gates on it
```

## DOCX generation
- `docx` npm package (global): `NODE_PATH="$(npm root -g)" node script.js`
- Brand colors: `#1A3C6D` / `#2E86C1` / `#E67E22`, Arial, US Letter
- Output: `/Users/Artist APP/docs/`

## Documentation
Full doc suite at `/Users/Artist APP/docs/` — PRD, Architecture, DB Schema, API Spec, User Stories/Journeys, UI/UX, Integration, Roadmap, Launch Ops, Testing, Security, DevOps, Master Strategy.
