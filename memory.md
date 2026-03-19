# Session Memory — Artist Booking Platform

## Last Updated: 2026-03-16 (Session 2)

## Current State

### What's Working ✅
- **GitHub repo**: `SNAPR68/Artist-App` — code pushed to `main`
- **Vercel frontend**: Deployed, publicly accessible, search page showing 100 artists
  - URL: `artist-booking-jvbmsu14v-tscllps-projects.vercel.app`
  - Deployment Protection: disabled for production
- **Render API**: Deployed, database + redis connected
  - URL: `https://artist-booking-api.onrender.com`
  - Health: `{"status":"ok","database":"ok","redis":"ok"}`
- **Database (Supabase)**: Connected via auto-rewrite in `database.ts`
  - Code auto-rewrites `db.*.supabase.co` (IPv6) → `pooler.supabase.com` (IPv4)
- **End-to-end flow**: Search → API → Database → artist data ✅
- **Supabase**: Healthy, Pro plan, Sydney, 17 migrations, 126 seed records

### Cleanup Needed ⚠️
- Delete `artist-app-api` Vercel project (unnecessary — API runs on Render)
- Render Environment Group has misspelled `DATABAS_URL` — clean up
- Render service-level `DATABASE_URL` still points to direct connection (works via code auto-rewrite)

## Deployment Checklist
- [x] GitHub repo created and code pushed
- [x] Vercel frontend deployed and rendering
- [x] Render API deployed and build working
- [x] Redis connected (Upstash)
- [x] Database connected (Supabase) ✅
- [x] End-to-end flow working (search returns artists) ✅
- [ ] Delete `artist-app-api` Vercel project
- [ ] Assign custom domain
- [ ] Test login/OTP flow
- [ ] Razorpay integration testing
- [ ] WhatsApp/SMS notification setup

## Key Debugging Info

### Supabase Connection
- Project ref: `wqfzlkkkcsjrwksjpxfp`
- Region: ap-southeast-2 (Sydney)
- DB password contains `@` — must be URL-encoded as `%40`
- **Must use session pooler** (IPv4 compatible): `aws-1-ap-southeast-2.pooler.supabase.com:5432`
- Direct connection is IPv6 only — doesn't work on Render
- **Auto-rewrite**: `database.ts` automatically converts direct → pooler in production

### Render
- Free tier: spins down after inactivity, cold start ~50s
- Blueprint managed (from `render.yaml`)
- **Note**: Env vars are hard to change via dashboard for Blueprint-managed services

### Recent Commits (newest first)
1. `c597367` — Remove temporary /debug/db endpoint
2. `c520b65` — Auto-rewrite Supabase direct connection to IPv4 session pooler
3. `3fdce1b` — Expose database error details in health check
4. `eace8b3` — Enable SSL for production DB connections

## Phase 1 MVP Progress
- Sprint 1 (Infrastructure): ✅ Complete
- Sprint 2 (Auth): Code written, not tested in production yet
- Sprint 3-6: Code written, needs production testing
