# Production Readiness Plan: 52 → 100

## Context
Platform is functionally built (77 migrations, 237 endpoints, 49 pages) but has critical gaps in payments, security, monitoring, infrastructure, and content that prevent a real launch. This plan is organized into 6 sprints by priority — each sprint unlocks a measurable readiness jump.

---

## Sprint 1: "Can't Launch Without This" (52 → 70)
**Timeline: 1 week | Impact: Unblockable prerequisites**

### 1.1 Remove magic OTP bypass in production
- **File:** `apps/api/src/modules/auth/sms.service.ts`
- Remove `123456` acceptance when MSG91 not configured
- Add `OTP_BYPASS_ENABLED` env var (only `true` in dev/staging)
- Add OTP expiry validation (check `otp_expires_at` before accepting)

### 1.2 Initialize Sentry SDK on API
- **File:** `apps/api/src/app.ts`
- Add `Sentry.init({ dsn, environment, release, tracesSampleRate: 0.1 })`
- Wrap Fastify with `Sentry.setupFastifyErrorHandler(app)`
- Add `SENTRY_DSN` env var to Render

### 1.3 Wire up real SMS (MSG91)
- Get MSG91 account + API key + OTP template
- Add `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID` to Render env vars
- Test real OTP delivery end-to-end

### 1.4 Wire up real email (Resend)
- Get Resend account + API key + verified domain
- Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL` to Render env vars
- Test booking confirmation email delivery

### 1.5 Upgrade infrastructure: Render paid tier
- Move API from free → Starter ($7/mo) — eliminates 30-60s cold starts
- Add `HEALTH_CHECK_PATH=/health` in Render settings
- Enable auto-deploy from `main` branch

### 1.6 Payment webhook signature verification
- **File:** `apps/api/src/modules/payment/payment.service.ts`
- Add Razorpay webhook signature validation using `X-Razorpay-Signature` header
- Add webhook idempotency (check if event already processed via `payment_events` table or idempotency key)

### 1.7 Rate limit OTP endpoint
- **File:** `apps/api/src/modules/auth/auth.routes.ts`
- Add per-phone rate limit: max 5 OTP requests per hour
- Add per-IP rate limit: max 20 OTP requests per hour

---

## Sprint 2: "Payment & Booking Flow" (70 → 80)
**Timeline: 1 week | Impact: Users can actually transact**

### 2.1 Razorpay live credentials
- Get Razorpay live key/secret (KYC required)
- Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` to Render
- Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` to Vercel
- Remove mock mode fallback or gate behind env var

### 2.2 Add refund webhook handlers
- **File:** `apps/api/src/modules/payment/payment.service.ts`
- Handle `refund.processed`, `refund.failed` Razorpay events
- Update booking status on refund completion

### 2.3 Payment reconciliation cron
- **File:** new `apps/api/src/cron/payment-reconciliation.ts`
- Every 15 minutes: check Razorpay API for payments in `PENDING` > 30 min
- Auto-capture or auto-fail based on Razorpay status

### 2.4 End-to-end booking test
- Manually test full flow: Search → View Artist → Book → Pay → Confirm → Complete
- Fix any blockers found
- Document the flow with screenshots

### 2.5 Add Razorpay rate limiting
- Rate limit `/v1/payment/*` endpoints: max 10 requests/min per user

---

## Sprint 3: "Security Hardening" (80 → 85)
**Timeline: 3-4 days | Impact: Not hackable**

### 3.1 JWT token rotation
- **File:** `apps/api/src/modules/auth/auth.service.ts`
- Implement refresh token rotation: issue new refresh token on each refresh
- Store refresh token hash in DB, invalidate old one
- Reduce access token TTL: 24h → 15 min
- Reduce refresh token TTL: 7d → 30d (but single-use)

### 3.2 Token revocation on logout
- **File:** `apps/api/src/modules/auth/auth.service.ts`
- On logout: delete refresh token from DB
- Add Redis blacklist for access tokens (TTL = remaining token life)

### 3.3 Input sanitization
- Add `xss` or `sanitize-html` package
- Create sanitize middleware for all POST/PUT/PATCH bodies
- Strip HTML tags, script injections from user input

### 3.4 Request body size limit
- **File:** `apps/api/src/app.ts`
- Set `bodyLimit: 1048576` (1MB) globally
- Set `bodyLimit: 10485760` (10MB) for media upload routes only

### 3.5 Fix CSP for production
- Remove `unsafe-eval` from CSP where possible
- Keep `unsafe-inline` only for Razorpay checkout (document why)
- Add nonce-based CSP for inline scripts

---

## Sprint 4: "Monitoring & Observability" (85 → 90)
**Timeline: 3-4 days | Impact: Know when things break**

### 4.1 Sentry full integration
- Add source maps upload to Vercel build
- Add `Sentry.captureException()` in all catch blocks
- Add performance monitoring (traces)
- Configure alert rules: error spike, P99 latency

### 4.2 Uptime monitoring
- Set up BetterStack/Upstash uptime checks:
  - API: `https://artist-booking-api.onrender.com/health` (1 min interval)
  - Web: `https://artist-booking-web.vercel.app` (1 min interval)
- Configure Slack/email alerts on downtime

### 4.3 Structured logging to persistent store
- Add Axiom, Logtail, or BetterStack log drain
- Configure Render log forwarding
- Set up log retention (30 days min)

### 4.4 Add Redis caching to hot endpoints
- **Files:** `apps/api/src/modules/artist/artist.service.ts`, `apps/api/src/modules/search/search.service.ts`
- Cache artist public profiles (5 min TTL)
- Cache search results (2 min TTL, already partial)
- Cache homepage data (featured artists, categories — 10 min TTL)
- Add cache invalidation on profile update

### 4.5 Database query timeout
- **File:** `apps/api/src/infrastructure/database.ts`
- Add `statement_timeout: 30000` (30s) to Knex pool config
- Log slow queries (> 1s) at warn level

---

## Sprint 5: "SEO, Content & Polish" (90 → 95)
**Timeline: 1 week | Impact: Discoverable and professional**

### 5.1 Dynamic metadata per page
- Add `generateMetadata()` to all public pages:
  - `/artists/[id]` — artist name, photo, genre as OG tags
  - `/search` — "Find Artists in {city}" dynamic title
  - `/gigs/[id]` — gig details as OG tags
- Add Twitter Card tags

### 5.2 Sitemap & robots.txt
- **File:** new `apps/web/src/app/sitemap.ts`
- Generate dynamic sitemap from artist profiles + static pages
- Add `robots.txt` allowing all crawlers

### 5.3 JSON-LD structured data
- Add `Event`, `Person`, `Organization` schemas to relevant pages
- Add `BreadcrumbList` schema to all pages

### 5.4 Seed 50+ real artist profiles
- Work with actual artists or create realistic demo profiles
- Include photos, bios, genres, pricing, availability
- Cover all categories: DJ, Singer, Band, Comedian, Dancer, etc.

### 5.5 Fix known UI bugs
- ArtistChat "Thinking..." spinner stuck (add timeout + fallback)
- Chat widget mobile overlap (adjust z-index/positioning)
- Hero image fallback (add error boundary for broken images)

### 5.6 Mobile device testing
- Test on iPhone Safari, Android Chrome, Samsung Internet
- Fix any responsive layout issues
- Test PWA install flow on both platforms

### 5.7 Error pages
- Custom 404 page (branded, with navigation)
- Custom 500 page (branded, with retry)
- Offline page styling (already exists, verify branding)

---

## Sprint 6: "Production Hardening" (95 → 100)
**Timeline: 1 week | Impact: Battle-tested and scalable**

### 6.1 Load testing
- Use k6 or Artillery to load test:
  - Search endpoint: 100 concurrent users
  - Auth flow: 50 concurrent OTP requests
  - Booking creation: 20 concurrent bookings
- Identify and fix bottlenecks

### 6.2 Database optimization
- Add missing indexes based on slow query analysis
- Set up Supabase automated backups (verify schedule)
- Document recovery procedure
- Add connection pool monitoring

### 6.3 CDN & caching headers
- Configure Vercel Edge caching for static assets
- Add `Cache-Control` headers for API responses (search, public profiles)
- Configure image CDN (Vercel Image Optimization already active)

### 6.4 Staging environment
- Create dedicated staging API on Render (separate instance)
- Point `develop` branch Vercel previews to staging API
- Add staging-specific env vars
- Run E2E tests against staging before promoting to prod

### 6.5 Smoke tests post-deploy
- **File:** `.github/workflows/deploy-production.yml`
- After deploy: hit `/health`, `/v1/search/artists`, `/v1/auth/otp/generate` (dry run)
- Fail deployment if smoke tests fail
- Add Slack notification on deploy success/failure

### 6.6 Feature flags
- Add PostHog feature flags (already have PostHog)
- Gate new features behind flags
- Enable gradual rollout for risky changes

### 6.7 Legal & compliance
- Privacy policy page (exists, verify content)
- Terms of service page (exists, verify content)
- Cookie consent banner
- GDPR data deletion endpoint
- Payment compliance (PCI-DSS via Razorpay — document)

### 6.8 Documentation
- API docs (Swagger/OpenAPI) — auto-generate from Fastify schemas
- Onboarding guide for new developers
- Runbook for common production issues

---

## Score Progression

| After Sprint | Score | What's Unlocked |
|-------------|-------|-----------------|
| Sprint 1 | 70 | Real OTPs, error tracking, no cold starts, secure payments |
| Sprint 2 | 80 | Users can pay real money, full booking cycle works |
| Sprint 3 | 85 | Can't be easily hacked, tokens are secure |
| Sprint 4 | 90 | Know when things break, fast response times |
| Sprint 5 | 95 | Google can find you, app looks professional |
| Sprint 6 | 100 | Battle-tested, scalable, legally compliant |

---

## What I (Claude) Can Build vs. What You Need to Do

### I can build (code changes):
- All security fixes (JWT rotation, sanitization, rate limiting, CSP)
- Sentry initialization, webhook hardening, caching, SEO tags
- Smoke tests, error pages, UI bug fixes, metadata
- Payment reconciliation cron, feature flags integration
- Sitemap, robots.txt, JSON-LD, dynamic OG tags
- Input sanitization middleware, body size limits
- Database query timeouts, slow query logging
- Custom 404/500 pages, offline page branding

### You need to do (accounts/credentials):
| What | Where | Cost |
|------|-------|------|
| MSG91 account + API key | msg91.com | ~₹1/SMS |
| Resend account + API key | resend.com | Free tier (100 emails/day) |
| Razorpay live KYC + credentials | razorpay.com | 2% per transaction |
| Render paid plan upgrade | render.com | $7/mo |
| BetterStack/Axiom account | betterstack.com | Free tier available |
| Real artist content (photos, bios) | Manual effort | Time |
| Legal review of privacy/terms | Lawyer | Varies |
| Custom domain + SSL | Registrar | ~$12/yr |

### Estimated total monthly cost to run at 100:
| Service | Cost |
|---------|------|
| Render Starter | $7/mo |
| Supabase (current free tier) | $0 (upgrade to $25/mo at scale) |
| Upstash Redis (current free tier) | $0 (upgrade at scale) |
| Vercel Pro | $0 (hobby) or $20/mo (pro) |
| Resend | $0 (free tier) |
| MSG91 | Pay-per-use (~₹1/SMS) |
| Sentry | $0 (free tier, 5K events/mo) |
| PostHog | $0 (free tier, 1M events/mo) |
| BetterStack | $0 (free tier) |
| **Total** | **~$7-52/mo** |
