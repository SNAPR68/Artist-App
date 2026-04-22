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

---

## Session Update: 2026-04-22 — Event Company OS Pivot

### Decision
GRID repositioned from "artist booking with voice" to **Event Company Operating System**. Audit showed we cover ~15% of one operational domain (artist booking). Event companies run 10 domains.

### MVP Scope Locked (30–35 days)
1. Multi-vendor booking (artist + caterer + AV + photo + decor)
2. Unified Event File (client + all vendors under one event)
3. Outbound voice extended to all 5 vendor categories
4. Auto call sheet PDF + SMS broadcast
5. Day-of ROS-triggered "ETA?" check-in calls

### Key Decision: No Inbound Voice
Agencies want humans answering client calls. Intake already has 4 surfaces (/brief, WhatsApp, Zara/Kabir, referrals). Cut from roadmap.

### Data Model Strategy: Shortcut
Add `category` enum column to `artist_profiles` (artist|caterer|av|photo|decor). Reskin UI to "vendors." DO NOT refactor to polymorphic `vendors` table until month 3+.

### Codebase Audit Findings
- ❌ No inbound voice infra — CUT from scope
- ❌ Vendor model hardcoded to artists (13+ artist_* tables) — use category column shortcut
- ⚠️ Event File partial — `workspace_events` + `workspace_event_bookings` exist, missing `client_id` + category on bookings — 1 week extend

### Reusable Existing Infra
- workspace_events + workspace_event_bookings tables ✅
- notification module (WhatsApp/SMS/Push/Email) ✅
- document module (PDF gen) ✅
- decision-engine + clarifying-questions service ✅
- Outbound voice (Zara/Kabir, 6 intents) ✅

### Sprint Plan
- **Sprint A (wk 1–2):** Vendor categories on artist_profiles + UI reskin + seed data
- **Sprint B (wk 3–4):** Event File client_id + voice extended to all categories
- **Sprint C (wk 5):** Call sheet PDF + SMS broadcast + day-of voice check-ins
- **Sprint D (post-35d):** Pilot with 2 agencies, metrics, bug fixes

### Success Metrics
- 60% of events book ≥2 vendor categories via GRID
- 80% of events get auto call sheet
- 70% check-in response rate
- 5 paying agencies @ ₹15K/mo within 60d of ship

### Reference
Full expansion PRD: `docs/strategy/prd.md` Part 2 (sections 22–31)
Full sprint doc: `docs/strategy/sprints-event-os-mvp.md` (section 13 = locked decisions, supersedes 1–12)

---

## Session Update: 2026-04-22 (post-review) — Decisions Locked

### Revised MVP (supersedes above)
**Categories (5):** `artist | av | photo | decor | license` (Model A: license agents as vendors)
**Sprint D wk1:** `promoters | transport`
**Dropped entirely:** `caterer`. **Excluded from MVP:** `venue`.
**AV = bundled** sound+lights+stage.

### New MVP capabilities beyond original
- Tech rider consolidation (PDF + Excel, both upload paths)
- BOQ builder (PDF + Excel, re-upload = file-of-record)
- Standardized microsite `/a/[slug]` + transcode pipeline
- Instagram OAuth (Option A, Meta app review Day 1 Sprint A)
- Call sheet: SMS + WhatsApp + **Email**
- EPK bundle (PDF + Excel + PPTX + MP4) — Sprint D wk2

### CTO calls
- BOQ re-upload = file-of-record (no parse-back)
- IG = Option A (OAuth + data sync), fallback to paste-URL if Meta rejects

### Pilot + pricing
- Pilots NOT pre-committed, recruit Sprint C
- **Free pilot, no pricing until post-pilot**
- Revised metric: 2 agencies using MVP for real bookings; pricing month 3

### Timeline
~56 working days / ~11 weeks (expanded from 35d; Raj approved each addition individually as core differentiator).
