# WhatsApp Template Submission — Interakt / Meta

_Last updated: 2026-04-23_

GRID's Event Company OS uses three WhatsApp Business API templates routed
through Interakt. All three need Meta approval before production send. DLT
registration is **not** required for WABA templates; Interakt handles
template delivery directly on Meta's WhatsApp infrastructure. The DLT
dependency was dropped 2026-04-23 along with the MSG91 SMS fallback.

## Provider chain
```
GRID API  →  Interakt HSM send API  →  Meta Cloud API  →  vendor's WhatsApp
```
Inbound replies:
```
vendor reply  →  Meta  →  Interakt webhook  →  POST /v1/webhooks/whatsapp  →  whatsapp-conversation.service
```

## Templates to submit (3)

### 1. `call_sheet_ready_v1`
- **Category:** Utility
- **Language:** English (en_GB) + Hindi (hi) variants
- **Body:**
  ```
  Call sheet is ready for {{1}} on {{2}} at {{3}}.
  PDF: {{4}}
  Excel: {{5}}

  Arrive 60 min before your call time. Questions? Reply to this message.
  ```
- **Variables (in order):**
  1. `event_name` — e.g. "Rohit × Priya Sangeet"
  2. `event_date` — ISO yyyy-mm-dd
  3. `city` — e.g. "Mumbai"
  4. `pdf_url` — CDN URL
  5. `xlsx_url` — CDN URL
- **Buttons:** none (URLs inline in body)
- **Code reference:** `apps/api/src/modules/event-file/call-sheet.service.ts::dispatch()`

### 2. `vendor_confirm_v1`
- **Category:** Utility
- **Language:** English (en_GB) + Hindi (hi)
- **Body:**
  ```
  Please confirm your booking for {{1}} on {{2}} at {{3}}.

  Reply YES to confirm or NO to decline.
  Or tap: {{4}}
  ```
- **Variables:**
  1. `event_name`
  2. `event_date`
  3. `city`
  4. `confirm_url` — https://grid.live/v/confirm/{token}
- **Buttons (recommended):** two quick-reply buttons — `YES` and `NO`. If Meta
  does not approve quick-reply buttons for utility, fall back to URL button
  with confirm_url and rely on the inbound YES/NO text parser (already
  wired in `whatsapp-conversation.service.ts::parseShortReply`).
- **Code reference:** `apps/api/src/modules/event-file/call-sheet.service.ts::sendVendorConfirmations()`

### 3. `day_of_checkin_v1`
- **Category:** Utility
- **Language:** English (en_GB) + Hindi (hi)
- **Body:**
  ```
  Morning! {{1}} is today at {{2}}.

  Are you on track? Reply:
  YES — all good, on schedule
  DELAYED — running late
  HELP — need production team NOW
  ```
- **Variables:**
  1. `event_name`
  2. `city`
- **Buttons (recommended):** three quick-replies — `YES`, `DELAYED`, `HELP`. If
  Meta rejects 3-button utility templates, reduce to `YES` / `DELAYED` and
  keep `HELP` text-only (inbound parser handles both cases).
- **Code reference:** `apps/api/src/modules/event-file/call-sheet.service.ts::sendDayOfCheckins()`

## Submission checklist

### In Interakt dashboard
1. Log in → Channels → WhatsApp → Manage Templates
2. Create new template, paste body + variable labels above
3. Set **Category: Utility** (not Marketing — these are transactional post-booking)
4. Language: English (en_GB) first, Hindi (hi) second
5. Add placeholder samples for each variable:
   - `{{1}}` → "Rohit × Priya Sangeet"
   - `{{2}}` → "2026-05-01"
   - `{{3}}` → "Mumbai"
   - `{{4}}` → "https://cdn.grid.live/files/sample.pdf"
6. Submit for approval (Meta review typically 1–24h for Utility category)

### In our codebase, after Meta approval
1. Update the `whatsapp_template_id` in `apps/api/src/modules/notification/template.registry.ts` from the `_v1` placeholder to whatever template name Interakt assigns (usually matches)
2. Set env var `INTERAKT_API_KEY` on Render
3. Set env var `INTERAKT_WEBHOOK_SECRET` on Render (shared HMAC-SHA256 secret for webhook signature verification)
4. In Interakt dashboard → Webhooks → point to `https://artist-booking-api.onrender.com/v1/webhooks/whatsapp`

### Rejection-risk watchouts
- **Links in body:** Meta allows links in Utility templates but rejects obviously shortened/obfuscated URLs. Use full `https://grid.live/...` form, not `bit.ly`.
- **Promotional phrasing:** words like "book now", "limited time", "special offer" will flip the template to Marketing category — keep copy strictly transactional.
- **Variable-only body:** body must contain at least one fixed sentence; `{{1}} {{2}}` alone will be rejected.
- **Button count:** Meta caps quick-reply buttons at 3. More than 3 options → split into a second template or fall back to text parsing.

## Testing the full loop (post-approval)

1. Send a real vendor_confirm to your own phone:
   ```
   curl -XPOST https://artist-booking-api.onrender.com/v1/event-files/{id}/vendor-confirmations \
     -H "Authorization: Bearer {your-session-token}"
   ```
2. Reply `YES` on WhatsApp
3. Verify `event_file_vendors.confirmation_status` flipped to `confirmed` in Supabase
4. Repeat for day_of_checkin with reply `DELAYED`
5. Verify `checkin_status = 'delayed'`

## Rollback / kill-switch

If Meta suspends the WhatsApp Business number or Interakt has a regional
outage, there is no SMS fallback (removed 2026-04-23). Manual fallback:
operators call vendors directly and mark the roster row confirmed/on_track via
the event-file UI. A manual status-override button should be added to the
Day-of tab (tracked separately — not a blocker for the May 1 demo).
