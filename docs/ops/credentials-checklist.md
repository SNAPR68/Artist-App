# Credentials Checklist — Pilot Go-Live

_Last updated: 2026-04-22_

Real credentials needed to flip GRID from "dev bypass" to full production for pilot agencies.
Tick each box as keys land. Everything below graceful-degrades today (dev bypass / mock adapter) — pilots can demo without all of them, but real-user delivery requires them.

## MSG91 — Transactional SMS (OTP + call-sheet dispatch)
- [ ] Sign up at msg91.com (business account, Indian entity)
- [ ] Complete DLT registration (TRAI mandate) — takes 3–7 days
  - Register Entity (Snap-R Services)
  - Register Headers: `GRIDIN`
  - Register templates (minimum set):
    - OTP: `Your GRID verification code is {#var#}. Valid 10 min.`
    - Call sheet ready: `Hi {#var#}, your call sheet for {#var#} on {#var#} is ready: {#var#}`
    - Day-of reminder: `{#var#}, confirming you're on-site at {#var#} by {#var#}. Reply 1=confirmed 2=delayed.`
- [ ] Grab Auth Key from MSG91 → API Keys
- [ ] Set on Render (`artist-booking-api` service):
  - `MSG91_AUTH_KEY`
  - `MSG91_SENDER_ID=GRIDIN`
  - `MSG91_OTP_TEMPLATE_ID`
  - `MSG91_CALLSHEET_TEMPLATE_ID`
  - `OTP_BYPASS_ENABLED=false` (flip off dev bypass once keys work)
- [ ] Smoke test: `POST /v1/auth/otp/send` with a real phone, confirm SMS arrives in < 30s.

## Interakt — WhatsApp Business (call-sheet delivery + booking confirmations)
- [ ] Sign up at interakt.shop, approve WhatsApp Business account via Meta (7–14 days)
- [ ] Register templates in Interakt (pre-approved by Meta):
  - `callsheet_ready` — header PDF attachment, body with event name + date
  - `booking_confirmed` — body with vendor name, event, amount, receipt link
  - `day_of_checkin` — button-interactive: "I'm on-site" / "Running late"
- [ ] Grab Interakt API key → Settings → Developer Settings
- [ ] Set on Render:
  - `INTERAKT_API_KEY`
  - `INTERAKT_PHONE_NUMBER_ID`
- [ ] Smoke test: trigger a call-sheet dispatch from Event File detail page → Day-of tab, confirm WhatsApp with PDF attachment lands.

## Resend — Transactional email (call sheets, invoices, EPK links)
- [ ] Sign up at resend.com
- [ ] Verify domain `grid.live` (or whichever final domain) — SPF + DKIM + DMARC records in DNS
- [ ] Create API key scoped to sending only
- [ ] Set on Render:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL=ops@grid.live`
- [ ] Smoke test: create an Event File with client email, dispatch call sheet, confirm email with PDF arrives to Gmail inbox (not spam).

## ElevenLabs — Cloud TTS for Zara + Kabir (voice assistant + outbound day-of calls)
- [ ] Sign up at elevenlabs.io, pick Creator plan ($22/mo → 100k chars ≈ 50k calls at 2 chars each)
- [ ] Clone or pick voices:
  - Zara (English, female, warm) — pick a default multilingual v2 voice and tag `GRID_ZARA_VOICE_ID`
  - Kabir (Hindi, male, energetic) — multilingual v2 voice tagged `GRID_KABIR_VOICE_ID`
- [ ] Set on Vercel (`artist-booking-web`):
  - `ELEVENLABS_API_KEY`
  - `ELEVENLABS_ZARA_VOICE_ID`
  - `ELEVENLABS_KABIR_VOICE_ID`
- [ ] Set on Render (for outbound calls):
  - Same `ELEVENLABS_API_KEY`
- [ ] Smoke test: open homepage, click Zara mascot, say "Find DJ in Mumbai", confirm cloud TTS reply (not browser fallback). Browser TTS = fallback, means env not set.

## Meta — Instagram Business API (artist microsite auto-import)
- [ ] Create Meta app at developers.facebook.com → Business type
- [ ] Add Instagram Graph API + Facebook Login products
- [ ] Configure OAuth redirect URIs:
  - `https://artist-booking-web.vercel.app/api/auth/instagram/callback`
  - (dev) `http://localhost:3000/api/auth/instagram/callback`
- [ ] Submit for App Review with permissions:
  - `instagram_basic`
  - `instagram_manage_insights`
  - `pages_show_list`
  - `business_management`
- [ ] App Review needs a recorded screencast walkthrough — ~2 min showing artist onboarding → "Connect Instagram" → OAuth → microsite auto-populated. See `docs/ops/meta-app-review-checklist.md` for script.
- [ ] Set on Vercel + Render:
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_GRAPH_API_VERSION=v20.0`
- [ ] Review turnaround: 5–10 business days. Resubmit with corrections if rejected.

## Firebase — Push notifications (Sprint E, not blocking for pilot)
Already configured for dev; prod FCM service account should be rotated before GA (not pilot-blocking):
- [ ] Generate new service account JSON in Firebase console
- [ ] Paste as `FIREBASE_SERVICE_ACCOUNT_JSON` on Render (as stringified JSON)

## Razorpay — live payments (post-pilot only)
Free pilot → no payments during pilot phase. Gather during pilot:
- [ ] Complete Razorpay KYC (PAN, bank, GSTIN, business proof) — 3–5 days
- [ ] Switch keys from test → live
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` on Render
- [ ] Webhook endpoint: `https://artist-booking-api.onrender.com/v1/webhooks/razorpay` — paste into Razorpay dashboard with events: `payment.captured`, `payment.failed`, `refund.processed`

## Sentry — Error tracking (optional but recommended)
- [ ] Confirm `SENTRY_DSN` is set on Render (see `docs/ops/observability-health.md`)
- [ ] Add `@sentry/nextjs` to web + `SENTRY_DSN` on Vercel (post-pilot polish)

---

## Pilot readiness gate
The minimum set to start a pilot with a real agency:
- **MSG91** (OTP login — critical, no login without this)
- **ElevenLabs** (voice demo is core to sales pitch)
- **Meta/Instagram** (artist microsite auto-populate — biggest WOW moment)

Interakt and Resend can fall back to "copy link, paste manually" for the first two pilots while review is pending.

## Keys already live (no action needed)
- `DATABASE_URL` (Supabase session pooler) ✓
- `REDIS_URL` (Upstash) ✓
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` ✓
- `PII_ENCRYPTION_KEY` (32-char AES-256-GCM) ✓
- `NEXT_PUBLIC_ANALYTICS_API_KEY` (PostHog `phc_fUuQTCOPouiN58JAl0tu7PIH1djEcbeRQzMXhUWNLFK`) ✓
