# Meta App Review — Submission Checklist

**Why:** Instagram Business API (`instagram_business_basic`, `instagram_business_manage_insights`, `pages_show_list`, `business_management`) requires Meta app review before production use. Review takes 2–3 weeks. **Submit Day 1 of Sprint A** so approval lands before Sprint B media work needs it.

## 1. App creation (Meta for Developers)

- [ ] Go to https://developers.facebook.com/apps → Create App
- [ ] App type: **Business**
- [ ] App name: `GRID Artist Sync`
- [ ] Contact email: `rajesh@snap-r.com`
- [ ] Business account: link to SNAP-R Business Manager (create one if none exists)

## 2. Products to add

- [ ] **Instagram Graph API** — for reels, posts, insights
- [ ] **Facebook Login for Business** — for OAuth connect flow
- [ ] **Pages API** — required dependency for IG Business accounts

## 3. Permissions to request (scope list)

| Permission | Why we need it | Review difficulty |
|---|---|---|
| `instagram_business_basic` | Fetch artist's IG profile, posts, reels | Low |
| `instagram_business_manage_insights` | Reel views, 30d reach, follower demographics | Medium |
| `pages_show_list` | List Pages linked to user's IG Business account | Low |
| `business_management` | Access Business Manager assets | Medium |
| `pages_read_engagement` | Read Page post engagement (for cross-posted content) | Low |

## 4. App review submission materials

Meta requires **each** of the following per permission:

- [ ] **Screencast (1–3 min)** showing:
  - Artist clicks "Connect Instagram" on `/dashboard/artist/media`
  - OAuth flow completes
  - Microsite at `/a/[slug]` renders with top 6 reels, follower count, 30d reach
  - Show that artist can disconnect at any time (privacy compliance)
- [ ] **Written use-case description (per permission)** — paste from `docs/ops/meta-permission-justifications.md` (create during Sprint B)
- [ ] **Platform privacy policy URL** — https://grid.live/privacy (verify exists, add IG data section if missing)
- [ ] **Platform terms URL** — https://grid.live/terms
- [ ] **Data Deletion Callback URL** — `https://api.grid.live/api/integrations/instagram/data-deletion` (build endpoint during Sprint B; required for approval)
- [ ] **Test user credentials** — Meta tests with a real IG Business account. Use a seed artist account linked to a test IG Business profile.

## 5. Technical prerequisites (pre-submission)

- [ ] HTTPS domain live (api.grid.live). ✅ Already deployed on Render.
- [ ] Valid SSL cert. ✅ Render-managed.
- [ ] OAuth redirect URI whitelisted in app settings: `https://api.grid.live/api/integrations/instagram/oauth/callback`
- [ ] Webhook verification endpoint built and reachable: `https://api.grid.live/api/integrations/instagram/webhook` (Sprint B)
- [ ] App must be in "Live" mode (not Development) — requires Business Verification first

## 6. Business Verification (gates Live mode)

- [ ] Submit business documents:
  - Certificate of Incorporation (SNAP-R LLP)
  - PAN card (business)
  - GST registration
  - Bank statement (business account, last 3 months)
- [ ] Verification turnaround: 3–5 business days
- [ ] Do this **before** submitting app review (review won't start without Live mode)

## 7. Day 1 Sprint A action items

| Task | Owner | Est |
|---|---|---|
| Create Meta Business Manager + link SNAP-R LLP | Raj | 30 min |
| Create Meta Developer app | Raj | 20 min |
| Submit Business Verification docs | Raj | 45 min |
| Draft Privacy Policy IG data section | Raj | 30 min |
| Create placeholder `/api/integrations/instagram/*` stubs (returns 501) | Eng | 1 hr |
| Register stub OAuth redirect + webhook URLs in app settings | Eng | 15 min |

**Total Day 1 effort: ~3 hours** (mostly Raj-side paperwork, runs parallel to Sprint A dev).

## 8. Fallback plan (if Meta rejects)

If rejected on any permission after the full 4-week cycle:

- **Option B (paste URL fallback):** artist pastes IG profile URL on `/dashboard/artist/media`. We render via IG oEmbed (no OAuth, no app review, but no data access — only pretty embeds). Ships in 1 day.
- **Hybrid:** keep OAuth for approved permissions (likely `instagram_business_basic` and `pages_show_list` always approve), fall back to manual URL paste for insights/reach data.

## 9. Status tracking

| Item | Status | Date |
|---|---|---|
| Business Manager created | ☐ | |
| Business Verification submitted | ☐ | |
| App created | ☐ | |
| Permissions requested | ☐ | |
| Screencast recorded | ☐ | |
| App Review submitted | ☐ | |
| App Review approved | ☐ | |

Update this table after each milestone.
