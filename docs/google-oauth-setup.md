# Google Calendar OAuth — Setup Guide

_Moat #1: Calendar graph. GRID becomes the artist's canonical calendar source of truth._

## What this enables

- Two-way sync between GRID bookings and artist's Google Calendar.
- Real-time availability from webhook push channels (watch).
- Artist's existing calendar commitments become GRID holds automatically.

## Prerequisites

- Google Cloud account with billing enabled (free tier is fine for dev).
- Admin access to the Google Cloud project (or ability to create a new project).

## Step 1 — Create Google Cloud Project

1. Go to <https://console.cloud.google.com/projectcreate>.
2. Project name: `grid-calendar-sync` (or reuse an existing GRID project).
3. Click **Create** and wait ~30s for provisioning.
4. Select the project from the top dropdown.

## Step 2 — Enable Google Calendar API

1. Navigate to **APIs & Services → Library**.
2. Search for **Google Calendar API**, click it, click **Enable**.

## Step 3 — Configure OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** (unless you have a Workspace org — then **Internal**).
3. Fill in:
   - App name: `GRID`
   - User support email: `rajesh@snap-r.com`
   - Developer contact: `rajesh@snap-r.com`
   - App logo: (upload GRID logo, optional for dev)
   - Application home page: `https://grid.live` (or your Vercel URL)
   - Privacy policy: `https://grid.live/privacy`
   - Terms of service: `https://grid.live/terms`
4. **Scopes** — click *Add or remove scopes* and add:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
5. **Test users** (required while app is in testing):
   - Add the email addresses of every artist/agent who needs to test before publishing.
6. Submit. While in **Testing** mode you are capped at 100 test users; publishing removes the cap but requires Google verification for sensitive scopes.

## Step 4 — Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: `GRID API — Calendar Sync`.
4. **Authorized redirect URIs** — add all environments you deploy to:
   - Local dev: `http://localhost:3001/v1/calendar/google/callback`
   - Staging: `https://artist-booking-api-staging.onrender.com/v1/calendar/google/callback`
   - Production: `https://artist-booking-api.onrender.com/v1/calendar/google/callback`
5. Click **Create** — download the JSON or copy **Client ID** and **Client secret**.

## Step 5 — Set Environment Variables

Add to Render (API) and `.env` (local):

```bash
GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxx
GOOGLE_OAUTH_REDIRECT_URI=https://artist-booking-api.onrender.com/v1/calendar/google/callback
PUBLIC_API_URL=https://artist-booking-api.onrender.com
```

For local dev set `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/v1/calendar/google/callback`.

## Step 6 — Set Up Push Notifications (Watch Channels)

Google Calendar sends change notifications to an HTTPS endpoint.

- Endpoint: `POST ${PUBLIC_API_URL}/v1/calendar/google/webhook`
- **Must be HTTPS in production** — Google rejects HTTP watch registrations.
- The endpoint is already implemented in `apps/api/src/modules/calendar/google-calendar.routes.ts`.

Domain verification (only required for production, one-time):

1. **APIs & Services → Domain verification**.
2. Add your API domain (e.g. `artist-booking-api.onrender.com`).
3. Follow the verification steps (DNS TXT record or HTML file upload on the target domain).

## Step 7 — Publish App (Production Only)

Sensitive scopes require Google verification. Timeline: 3–6 weeks.

1. OAuth consent screen → **Publish app**.
2. Submit for verification with:
   - Scope justification: "GRID schedules live performance bookings on behalf of artists; calendar.events is required to create holds and block availability."
   - Demo video (2–3 min) showing the full OAuth flow and calendar write.
   - Privacy policy URL.
3. Respond to Google's review questions promptly.

While awaiting verification, the app works for test users listed in Step 3.

## Step 8 — Connect an Artist (Smoke Test)

1. Log in as an artist in the GRID web app.
2. Navigate to **Settings → Integrations → Google Calendar** (Phase 3 UI).
3. Click **Connect**. Complete the OAuth consent.
4. Verify in DB:
   ```sql
   SELECT user_id, provider, expires_at FROM calendar_connections WHERE provider = 'google';
   ```
5. Create a booking — a Google Calendar event should appear on the artist's calendar within ~5s.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `redirect_uri_mismatch` | Redirect URI not registered | Add exact URI (including trailing slash or lack thereof) in Step 4. |
| Watch channel `401` | Token expired | Our refresh logic should handle; check `calendar_connections.refresh_token_encrypted`. |
| Watch returns `410 Gone` | Sync token invalidated | Full re-sync triggers automatically via `syncToken` 410 handler. |
| `unverified_app` warning | App still in testing or pending verification | Add user as test user (dev) or complete verification (prod). |

## Security Notes

- Refresh tokens are encrypted at rest with `PII_ENCRYPTION_KEY` (AES-256-GCM).
- Webhook channel IDs are random UUIDs — a leaked channel ID alone cannot read calendar data.
- We store the minimum event metadata required (start/end/summary); no attendee PII.

## References

- OAuth scopes: <https://developers.google.com/identity/protocols/oauth2/scopes#calendar>
- Verification: <https://support.google.com/cloud/answer/9110914>
- Push notifications: <https://developers.google.com/calendar/api/guides/push>
