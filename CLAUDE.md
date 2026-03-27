# Artist Booking Platform — CLAUDE.md
_Last updated: 2026-03-26_

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
| voice-query | Voice intent parsing (6 intents: DISCOVER, STATUS, ACTION, INTELLIGENCE, EMERGENCY, NAVIGATE), 20+ page targets, role-based routing, Hinglish support |
| whatsapp | Conversational booking, intent parsing, conversation state machine |
| workspace | Event company CRM, team roles, event grouping, booking pipeline |

## RBAC
92 permissions across 5 roles: `artist`, `agent`, `client`, `event_company`, `admin`.

## Middleware (6)
`auth` | `error-handler` | `rate-limiter` | `rbac` | `request-logger` | `validation`

## Design System: Nocturne Hollywood
The frontend uses the **Nocturne Hollywood** dark theme — a cinematic glassmorphism design system from Stitch.

### Brand
- **Name**: ArtistBook (NOT "Nocturne Elite" — that's the Stitch codename)
- **Voice**: Human, direct, Indian market. No AI jargon or placeholder copy.

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-[#0e0e0f]` | Obsidian | Page backgrounds |
| `bg-[#1a191b]` / `bg-[#1a1a1d]` | Surface | Card backgrounds |
| `bg-[#201f21]` | Surface high | Elevated panels |
| `bg-[#262627]` | Surface highest | Deep containers |
| `bg-[#2c2c2d]` | Surface bright | Hover states |
| `text-[#c39bff]` / `#8A2BE2` | Primary purple | Brand, CTAs, accents |
| `text-[#a1faff]` | Cyan | AI/data highlights, labels |
| `text-[#ffbf00]` | Gold | Ratings, badges, secondary accent |
| `text-white/50` | — | Secondary text |
| `text-white/30` | — | Tertiary/muted text |
| `border-white/5` | — | Subtle borders |
| `border-white/10` | — | Standard borders |

### Typography
- **Display font**: `font-display` (Manrope) — headlines, page titles
- **Body font**: `font-sans` (Inter) — paragraphs, labels
- Headlines: `font-extrabold tracking-tighter`
- Labels: `text-xs tracking-widest uppercase font-bold`

### Layout Patterns
- **Bento Hero**: `grid grid-cols-1 md:grid-cols-12 gap-6` with `md:col-span-8` main + `md:col-span-4` sidebar
- **Glass Card**: `glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden`
- **Ambient Glow**: `<div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />`
- **Onboarding**: Full-screen `5+7` split with radial gradient background glows
- **Artist Profile**: Cover hero (aspect-[21/9]) + `8+4` tabbed content + sticky booking card

### CSS Utilities (defined in `apps/web/src/styles/globals.css`)
```
glass-card, glass-panel, glass-floating    — Glassmorphism surfaces
btn-nocturne-primary/secondary/accent      — Button variants
input-nocturne                             — Form inputs
badge-nocturne, nocturne-chip              — Tags and pills
nocturne-divider                           — Subtle 1px separator
nocturne-table                             — Dark table styling
text-gradient-nocturne                     — Purple-to-cyan gradient text
nocturne-nav-item, nocturne-nav-item-active — Sidebar navigation
stage-glow-violet, stage-glow-cyan         — Background radial glows
inner-glow-status/success/warning/error    — Status indicator box-shadows
nocturne-skeleton                          — Dark shimmer loading state
nocturne-overlay                           — Modal backdrop
```

### Stitch Reference Designs
Full HTML/Tailwind reference designs live in: `stitch_product_requirements_document (2)/stitch_product_requirements_document/`
Key folders: `premium_landing_page`, `artist_portfolio_hollywood_glamour`, `artist_management_hollywood_glamour`, `escrow_wallet_hollywood_glamour`, `ai_artist_discovery`, `booking_inquiry_management`, `onboarding_welcome_hollywood_glamour`, `fund_escrow_confirm_booking_1`, `booking_confirmed`

### Rebuild Status (as of 2026-03-26)
- **Done (12 pages)**: Landing page, artist dashboard, artist bookings list, artist earnings, artist financial, artist intelligence, client dashboard, client bookings list, client workspace detail, event company dashboard, agent dashboard, search results
- **Remaining (24 pages)**: See `COWORK_REBUILD_24_PAGES.md` for full handoff doc with templates

## Current Build Status (as of 2026-03-26)

### Production Score: ~100/100 (code complete)

### WORKING
- Login/auth flow (OTP with bypass for dev, real MSG91 ready)
- All 4 role dashboards: Artist, Client/Event Company, Agent, Admin
- Search API with 100 seeded artists across 10 cities
- Voice Assistant — Backstage AI floating widget with:
  - Web Speech API (mic input, works on HTTPS/Vercel deploy)
  - Browser TTS with English + Hindi voice picker
  - Guest mode: public artist search without login
  - Auth mode: full voice query API (6 intents, 40+ page targets)
  - Text input fallback when mic unavailable
- Escrow payments (8 states, auto-settlement, refund webhooks)
- PDF generation (branded multi-artist proposals)
- Event company workspace CRM + onboarding wizard
- PostHog analytics, Sentry error tracking, Firebase push notifications
- SEO: dynamic OG tags, sitemap, robots.txt, JSON-LD ready
- GDPR: account deletion endpoint, cookie consent banner
- Swagger API docs at /docs
- 100 seeded artist profiles with realistic data
- Nocturne Hollywood dark theme applied across all 50+ pages (zero light-theme classes)

### Security (Sprint 3)
- JWT 1h access / 30d refresh tokens
- XSS sanitization middleware on all POST/PUT/PATCH
- Request body size limits (1MB default, 10MB media)
- Rate limiting: OTP (5/hr per phone), payments (10/min per user)
- Webhook signature verification (Razorpay)
- Payment idempotency with FOR UPDATE locks

### Infrastructure
- Redis caching on search (2min), artist profiles (5min), homepage (10min)
- Cache-Control headers on public API responses
- Database query timeout (30s), slow query logging (>1s)
- Post-deploy smoke tests in CI

### REMAINING (manual, not code)
- MSG91 credentials (real SMS delivery)
- Resend credentials (real email delivery)
- Razorpay live KYC + credentials
- Render paid tier upgrade ($7/mo)
- BetterStack uptime monitoring
- Log drain setup
- Lawyer review of privacy/terms
- Load testing with k6

## Seed Data
- 100 artist profiles seeded in production Supabase
- Covers: DJ, Singer, Band, Comedian, Dancer across Mumbai, Delhi, Bangalore, etc.
- OTP bypass enabled in dev/staging (env var `OTP_BYPASS_ENABLED=true`, code `123456`)

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
