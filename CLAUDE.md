# Artist Booking Platform — CLAUDE.md

## Project Overview
India's live entertainment booking marketplace. Connects artists, clients, agents, and event companies. Monorepo with Fastify API + Next.js frontend.

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: `apps/api/` — Fastify 5, Knex (PostgreSQL), Redis, TypeScript ESM
- **Frontend**: `apps/web/` — Next.js 14 (App Router), Tailwind CSS, React Query, Zustand
- **Shared**: `packages/shared/` — Zod validators, enums, types, constants
- **UI**: `packages/ui/` — Shared React component library
- **DB**: `packages/db/` — Knex migrations + seeds

## Deployment Architecture
| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | `artist-booking-jvbmsu14v-tscllps-projects.vercel.app` |
| API | Render (free) | `https://artist-booking-api.onrender.com` |
| Database | Supabase (Sydney, ap-southeast-2) | `wqfzlkkkcsjrwksjpxfp.supabase.co` |
| Redis | Upstash | Set in Render env vars |
| Repo | GitHub | `SNAPR68/Artist-App` |

## Build Commands
```bash
# Local dev
pnpm install
pnpm --filter @artist-booking/shared build   # MUST build shared first
pnpm --filter @artist-booking/api dev
pnpm --filter @artist-booking/web dev

# Production build (API — used by Render)
pnpm --filter @artist-booking/shared build
cd apps/api && npx tsc -p tsconfig.build.json && npx tsc-alias -p tsconfig.build.json
node dist/app.js

# Production build (Web — used by Vercel)
pnpm turbo build --filter=@artist-booking/web
```

## Key Architecture Decisions
- **ESM throughout**: All packages use `"type": "module"`, imports need `.js` extensions in source
- **Path aliases**: `@/*` maps to `./src/*` in both api and web, resolved by `tsc-alias` for API builds
- **`@artist-booking/shared`**: workspace dependency, resolved via pnpm. In compiled API output, stays as bare specifier (resolved at runtime via node_modules)
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
2. **`@artist-booking/shared` not found during API build**: Ensure shared is built first (`pnpm --filter @artist-booking/shared build`)
3. **Database connection error on Render**: Must use Supabase session pooler URL (IPv4), not direct connection. Password `@` must be URL-encoded as `%40`.
4. **Vercel build fails**: Root directory must be blank (not `./` or `apps/web`). Build command: `pnpm turbo build --filter=@artist-booking/web`. Output dir: `apps/web/.next`.

## File Structure (Key Files)
```
apps/api/src/
  app.ts                          # Fastify entry point
  config/index.ts                 # Zod-validated env config
  infrastructure/database.ts      # Knex + SSL config
  infrastructure/redis.ts         # Redis client
  middleware/                     # auth, rbac, rate-limiter, error-handler
  modules/                       # auth, artist, client, search, booking, payment, etc.

apps/web/src/
  app/                           # Next.js App Router pages
  lib/api-client.ts              # API client (uses NEXT_PUBLIC_API_URL)
  components/                    # React components
  styles/globals.css             # Tailwind styles

packages/shared/src/
  enums/                         # UserRole, BookingState, PaymentStatus, etc.
  types/                         # TypeScript interfaces
  constants/                     # Business rules, rate limits
  validators/                    # Zod schemas
  utils/                         # Shared utilities
```

## Testing
```bash
pnpm turbo test          # Run all tests (vitest)
pnpm turbo typecheck     # Type check all packages
pnpm turbo lint          # Lint all packages
```

## Strategy & Documentation
- **Master Strategy**: `/Users/baba/Downloads/Master_Platform_Strategy.docx` — 16-part consolidated platform strategy
- **Doc Suite**: `/Users/Artist APP/docs/` — 13 project documents (PRD, Architecture, DB Schema, API Spec, User Stories, User Journeys, UI/UX, Integration, Roadmap, Launch Ops, Testing, Security, DevOps) + 1 master strategy = 14 total
- **Plan File**: `/Users/baba/.claude/plans/noble-forging-backus.md` — Detailed build plan with codebase gap analysis
- **Handoff**: `/Users/Artist APP/docs/handoff.md` — Session handoff with next steps

## Platform Thesis
This is NOT a booking marketplace. It is the intelligence and operations layer for India's live entertainment industry. The booking flow is commodity software. The moat is built in 3 layers:
1. Compounding data intelligence from every transaction
2. Reputation and career infrastructure that can't be ported
3. Operational workflow replacement that makes leaving expensive

## Current Build Status
**Fully implemented**: Booking state machine (12 states), calendar holds, quote negotiation, Razorpay payments/escrow/refunds, contract/invoice generation, 4-channel notifications, reviews, search, auth/RBAC, profiles, admin dashboard, dispute resolution (submit/evidence/resolve/appeal), connected cancellation pipeline (sub-types + refund + calendar + trust), payout integration (bank accounts + settlement auto-payout), concierge dashboard (search/book on behalf), pre-event coordination (T-minus checklists + rider + logistics + escalation), event-day operations (GPS arrival + soundcheck + set timing + dual-party completion), trust score redesign (70% behavioral / 30% stated), failure data capture (empty search + rejected quote + abandoned flow + booking dropoff), price intelligence (materialized view + fair price ranges + city comparison), agent commission dashboard (summary + history + roster performance), full RBAC wiring (coordination/event-day/analytics permissions), 8 cron jobs (holds + reviews + settlements + disputes + coordination escalation + event-day transition + trust recompute + price refresh), 15 notification templates.

**Missing (priority order)**: Voice interface, event company workspace, artist intelligence dashboard, dynamic pricing, recommendation system.

## DOCX Generation
When generating strategy/product documents:
- Use `docx` npm package (globally installed): `NODE_PATH="$(npm root -g)" node script.js`
- Styling: BRAND="1A3C6D", ACCENT="2E86C1", ACCENT2="E67E22", Font: Arial, US Letter
- Output to: `/Users/Artist APP/docs/`
