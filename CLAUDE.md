# Artist Booking Platform — CLAUDE.md
_Last updated: 2026-03-21_

## Project Overview
India's live entertainment booking marketplace connecting artists, clients, agents, and event companies through an intelligence-driven platform. Monorepo with Fastify API backend, Next.js frontend, and shared packages. 77 migrations, 36 API modules, 237 endpoints, 23 cron jobs, 49 frontend pages.

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
apps/api/          — Fastify REST API (36 modules, 237 endpoints, 6 middleware)
apps/web/          — Next.js 14 frontend (49 pages)
packages/shared/   — Zod validators, 35+ enums, types, constants
packages/ui/       — Shared React component library
packages/db/       — Knex migrations (77) + seeds
infrastructure/    — Docker, deploy configs
e2e/               — End-to-end tests
```

## Deployment Architecture
| Service | Platform | URL / Host |
|---------|----------|------------|
| Frontend | Vercel | `https://artist-booking-web.vercel.app` |
| API | Render (free) | `https://artist-booking-api.onrender.com` |
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

## Key Architecture Decisions
- **ESM throughout**: All packages use `"type": "module"`, imports need `.js` extensions in source
- **Path aliases**: `@/*` maps to `./src/*` in both api and web, resolved by `tsc-alias` for API builds
- **`@artist-booking/shared`**: workspace dependency via pnpm. In compiled API output, stays as bare specifier (resolved at runtime via node_modules)
- **`tsconfig.build.json`**: Relaxed TypeScript config for API builds (strict: false) — separate from strict dev tsconfig
- **SSL required**: Supabase pooler requires SSL; configured in `database.ts` for production
- **Session pooler**: Must use Supabase's IPv4-compatible shared session pooler (not direct connection) for Render

## Environment Variables

### Render (API)
- `DATABASE_URL` — Supabase session pooler URL (IPv4 compatible, `%40` encodes `@` in password)
- `REDIS_URL` — Upstash Redis URL
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — Supabase API access
- `PII_ENCRYPTION_KEY` — 32+ char key for AES-256-GCM encryption
- `NODE_ENV=production`, `PORT=3001`, `LOG_LEVEL=info`

### Vercel (Web)
- `NEXT_PUBLIC_API_URL` — Render API URL
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `ENABLE_EXPERIMENTAL_COREPACK=1` — Required for pnpm on Vercel

## Common Issues & Solutions
1. **Shared package not emitting dist/**: Delete `packages/shared/tsconfig.tsbuildinfo` (stale incremental build cache). All `*.tsbuildinfo` files are gitignored.
2. **`@artist-booking/shared` not found during API build**: Ensure shared is built first (`pnpm --filter @artist-booking/shared build`).
3. **Database connection error on Render**: Must use Supabase session pooler URL (IPv4), not direct connection. Password `@` must be URL-encoded as `%40`.
4. **Vercel build fails**: Root directory must be blank (not `./` or `apps/web`). Build command: `pnpm turbo build --filter=@artist-booking/web`. Output dir: `apps/web/.next`.
5. **CORS errors in browser**: API must whitelist the Vercel frontend origin in Fastify CORS config. Check `app.ts` for `origin` array and ensure the deployed frontend URL is included.

## Module Inventory (36 modules)
| Module | Description |
|--------|-------------|
| admin | Platform admin dashboard, system health, user management |
| agent | Agent profiles, commission tracking, artist roster management |
| analytics | Platform-wide analytics, usage metrics, funnel reporting |
| artist | Artist profiles, portfolio, availability, earnings dashboard |
| artist-intelligence | Career metrics, gig advisor, earnings snapshots, growth signals |
| auth | OTP login, session management, token refresh, role assignment |
| booking | 12-state booking machine, quotes, negotiation, confirmation |
| calendar | Calendar holds, availability, demand signals, fill rates |
| client | Client profiles, booking history, preferences |
| concierge | Search and book on behalf of clients, assisted booking flow |
| coordination | Pre-event T-minus checklists, logistics, rider fulfillment, escalation |
| dispute | Dispute submission, evidence upload, resolution, appeal pipeline |
| document | Contract and invoice PDF generation |
| dynamic-pricing | Rule-based surge, elasticity tracking, demand-aware auto-adjustment |
| emergency-substitution | Last-minute artist replacement matching and rebooking |
| event-context | Crowd demographics, vibe matching, event metadata capture |
| event-day | GPS arrival tracking, soundcheck, set timing, dual-party completion |
| financial-command | Payout integration, bank accounts, settlement auto-payout |
| gamification | Achievement badges, streaks, engagement rewards |
| gig-marketplace | Open gig listings, artist applications, marketplace matching |
| media | Image/video uploads, portfolio media management |
| notification | 37 templates across 4 channels (WhatsApp, SMS, Push, Email) |
| payment | Razorpay integration, escrow, refunds, payment lifecycle |
| pricing-brain | Market positioning, percentile rank, fair price ranges, city comparison |
| recommendation | Jaccard similarity, collaborative filtering, Rising Star detection |
| reputation-defense | Trust score (70% behavioral / 30% stated), failure data capture |
| review | Post-event reviews, ratings, response management |
| rider | Technical rider management, venue cross-reference, gap reports |
| search | Full-text artist search, filters, ranking |
| seasonal-demand | Seasonal pricing trends, demand forecasting, temporal analysis |
| shortlist | Client shortlists, comparison, favoriting |
| social-analyzer | Social media presence scoring, audience analysis |
| venue | Venue profiles, equipment inventory, artist compatibility scoring |
| voice-query | Voice/IVR intent parsing (stub) |
| whatsapp | Conversational booking, intent parsing, conversation state machine |
| workspace | Event company CRM, team roles, event grouping, booking pipeline |

## RBAC
92 permissions across 5 roles: `artist`, `agent`, `client`, `event_company`, `admin`.

## Middleware (6)
`auth` | `error-handler` | `rate-limiter` | `rbac` | `request-logger` | `validation`

## Current Build Status (as of 2026-03-21)

### WORKING
- Login/auth flow (OTP)
- Artist dashboard (seed user: DJ Arjun)
- Artist bookings list
- Navigation tabs
- Search API

### BROKEN
- ArtistChat widget — stuck on "Thinking..." spinner
- Hero image on homepage — shows alt text instead of image
- Chat widget overlaps homepage content
- Voice recognition not capturing input
- No event company login CTA on homepage

### UNTESTED
- Event company flow (full)
- Admin dashboard
- Agent dashboard
- Most dashboard sub-pages
- Public artist profiles

## Seed Data
Demo users (all use OTP `123456`):
- Artists, clients, agents, event companies seeded via `packages/db/seeds/`
- Primary test artist: DJ Arjun

## Platform Thesis
This is NOT a booking marketplace. It is the intelligence and operations layer for India's live entertainment industry. The booking flow is commodity software. The moat is built in 3 layers:
1. Compounding data intelligence from every transaction
2. Reputation and career infrastructure that can't be ported
3. Operational workflow replacement that makes leaving expensive

## Testing
```bash
pnpm turbo test          # Run all tests (vitest)
pnpm turbo typecheck     # Type check all packages
pnpm turbo lint          # Lint all packages
```

## DOCX Generation
When generating strategy/product documents:
- Use `docx` npm package (globally installed): `NODE_PATH="$(npm root -g)" node script.js`
- Styling: BRAND=`#1A3C6D`, ACCENT=`#2E86C1`, ACCENT2=`#E67E22`, Font: Arial, US Letter
- Output to: `/Users/Artist APP/docs/`

## Documentation
Full doc suite (PRD, Architecture, DB Schema, API Spec, User Stories, User Journeys, UI/UX, Integration, Roadmap, Launch Ops, Testing, Security, DevOps, Master Strategy) lives at:
`/Users/Artist APP/docs/`
