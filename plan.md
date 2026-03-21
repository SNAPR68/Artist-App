# Build Plan — Artist Booking Platform
_Last updated: 2026-03-21_

## Current State
- Backend: COMPLETE (77 migrations, 36 modules, 237 endpoints, 23 cron jobs)
- Frontend: 49 pages, partially working (artist dashboard works, most untested)
- Deploy: Vercel (frontend) + Render free tier (API) + Supabase (DB)

## Phase 1: Fix Broken Items (Week 1)

### P0 — Critical
- [ ] Fix ArtistChat widget "Thinking..." — debug API call, fix search params
- [ ] Fix voice recognition — Web Speech API not capturing audio
- [ ] Add event company login CTA on homepage
- [ ] Fix post-login redirect to role-based dashboard (/artist, /client, /agent, /admin)

### P1 — Important
- [ ] Fix hero image (broken, showing alt text)
- [ ] Fix chat widget overlapping homepage content (use compact pill bar)
- [ ] Verify ArtistChat returns rich artist cards with thumbnails

## Phase 2: Systematic QA (Week 2-3)

### Page-by-page testing (49 pages)
- [ ] Public pages: /, /search, /artists/[id], /privacy, /terms, /help
- [ ] Auth pages: /login, /verify (WORKING — verify redirect)
- [ ] Artist dashboard: /artist, /artist/bookings, /artist/calendar, /artist/profile, /artist/media, /artist/intelligence, /artist/finances
- [ ] Client dashboard: /client, /client/workspace/[id], /client/bookings
- [ ] Agent dashboard: /agent (roster, commissions)
- [ ] Admin dashboard: /admin (users, bookings, analytics)
- [ ] Other: /gigs, /voice, /notifications, /settings

### End-to-end flow testing
- [ ] Client booking flow: search → shortlist → inquire → quote → confirm → pay → review
- [ ] EC workspace flow: create workspace → invite team → add event → book artists → generate presentation
- [ ] Agent concierge flow: roster → search → book on behalf
- [ ] Dispute flow: file → evidence → resolve → appeal

## Phase 3: Connect Real Integrations (Week 4-5)
- [ ] Verify SMS OTP delivery works (MSG91)
- [ ] Connect email provider (Resend) — confirmations, invoices
- [ ] Set up Firebase push notifications
- [ ] Test Razorpay payment flow end-to-end (test mode)

## Phase 4: Security Hardening (Week 5-6)
- [ ] Move JWT from localStorage to httpOnly cookies
- [ ] Add Next.js middleware.ts for server-side route protection
- [ ] Add CSP headers to next.config.js
- [ ] Validate remaining ~20% of API routes (add Zod schemas)
- [ ] Add Razorpay webhook body validation

## Phase 5: Performance & Monitoring (Week 7-8)
- [ ] Set up Sentry error tracking (replace console.error)
- [ ] Add pagination to all list endpoints
- [ ] Add composite DB indexes for cron queries
- [ ] Replace raw <img> with next/image
- [ ] Upgrade from Render free tier (eliminate cold starts)
- [ ] Set up staging environment

## Phase 6: Launch Preparation (Week 9-10)
- [ ] Final security review
- [ ] Load testing (concurrent bookings, payment flows)
- [ ] Seed production data (real artists, venues)
- [ ] Prepare monitoring dashboards
- [ ] Go-live checklist execution

## Not in Scope (Post-Launch)
- ML-based pricing (currently rule-based)
- Mobile app (React Native / Flutter)
- Hinglish voice interface
- Offline booking capture
- Vendor network integration
- Financial services layer
