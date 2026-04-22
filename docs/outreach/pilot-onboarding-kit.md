# Pilot Onboarding Kit — Event Company OS
_Last updated: 2026-04-22_

Sent the moment a pilot is confirmed. Goal: first real event in GRID within 14 days.

---

## Email 1 — Welcome (Day 0, sent on confirmation call)

**Subject:** You're in — let's set up your first event in GRID

**From:** Raj <rajesh@snap-r.com>

**Body:**

Hi {{founder_first_name}},

Welcome aboard. {{company_name}} is one of 10 event companies running the GRID Event Company OS pilot. Free for 90 days, no card, no fine print.

Here's what happens next:

1. **Tomorrow, 11am** — 30-minute screen-share. I walk you through the Event File, call sheet generator, and vendor module. You pick one live event (anything in the next 4 weeks) to load in.
2. **Same call** — we import your vendor list (artists, AV, photo, decor, license). CSV, WhatsApp broadcast list, or we type it in — whatever's fastest.
3. **End of week** — first real call sheet goes out to your crew from GRID. SMS + WhatsApp + email, one tap.

What I need from you before the call:
- Name of one upcoming event we'll use as the test run
- Rough vendor count per category (just a number, no list yet)

Calendar link: {{calendar_link}}
WhatsApp: {{raj_whatsapp}} if anything comes up.

— Raj

---

## Email 2 — Pre-call prep (Day 0, 1 hour after Email 1)

**Subject:** Quick prep for tomorrow — 3 things

**Body:**

Hi {{founder_first_name}},

Three things to have ready tomorrow so we can skip the setup drudgery:

1. **Login credentials.** I'll send you an OTP to {{phone}} when we start. Make sure you can receive SMS.
2. **Vendor list (if you have one).** Excel, CSV, or a WhatsApp broadcast list export. We'll parse it live. Don't clean it up — we'll handle that.
3. **One event brief.** Client name, event date, city, venue, rough guest count. That's it.

Nothing to install. Runs in your browser.

See you at {{call_time}}.

— Raj

---

## Email 3 — Post-onboarding recap (Day 1, sent immediately after call)

**Subject:** Your GRID is live — here's what we set up

**Body:**

Hi {{founder_first_name}},

Great call. Quick recap of what's live in your workspace:

- **Workspace:** {{workspace_url}}
- **Test event loaded:** {{event_name}} ({{event_date}}, {{event_city}})
- **Vendors imported:** {{vendor_count}} across {{category_count}} categories
- **Team invited:** {{team_count}} ({{team_names}})

**Your homework this week:**
- [ ] Add the remaining vendors for {{event_name}}
- [ ] Confirm vendor quotes in GRID (replaces your quote-tracker sheet)
- [ ] Generate the call sheet on Friday — GRID sends it to crew automatically

I'll check in Thursday. If anything feels clunky, tell me. The whole point of a pilot is to fix it for you specifically.

— Raj

---

## Email 4 — Day 7 check-in

**Subject:** One week in — how's it going?

**Body:**

Hi {{founder_first_name}},

Quick check-in at the one-week mark.

A few questions, honest answers only:
1. **What saved you time this week?** (If nothing — that's fine, just tell me.)
2. **What's broken or annoying?**
3. **One feature you wished was there?**

Two ways to reply:
- Hit reply on this email (60 seconds)
- 15-minute call: {{calendar_link}}

Also — a few things I'm shipping this week based on pilot feedback so far:
{{recent_changes}}

— Raj

---

## Email 5 — Day 30 milestone

**Subject:** 30 days in — let's look at your numbers

**Body:**

Hi {{founder_first_name}},

You've run {{events_completed}} events through GRID this month. Here's what the numbers say:

- **Call sheets sent:** {{call_sheets_count}}
- **Vendors coordinated:** {{vendors_count}}
- **Day-of check-ins completed:** {{checkins_count}}
- **Time saved (estimated):** ~{{hours_saved}}h across the team

The next 60 days of the pilot are free. After that, pricing locks in — but pilot companies get grandfather rates (I'll share exact numbers at day 75).

One ask: if GRID has been useful, **can I get 15 minutes to film a short case study?** You keep full control over what we use, and you get first dibs on any public launch content.

Either way, thanks for being one of the first 10.

— Raj

---

## WhatsApp Follow-Up Cadence

_In parallel with emails. Short, casual, no links unless asked._

**Day 1 (after onboarding call):**
> {{founder_first_name}} — recap email just went out. Your workspace is live at {{workspace_url}}. Ping me here anytime.

**Day 3:**
> How's the vendor import going? Most companies hit a snag around photographer contacts. Want me to jump in for 10 min?

**Day 7:**
> One-week check-in. What's working, what's not? Reply here or email — whichever's easier.

**Day 14:**
> First call sheet gone out yet? If not, let's schedule it. I'll walk you through it live.

**Day 30:**
> One month in. Sent you a recap email — tl;dr you've run {{events_completed}} events through GRID. Thoughts?

---

## Internal Pilot Tracker Fields

For each pilot, track in a shared doc / Notion:

- Company name, founder, phone, email, city
- Status: `applied` → `qualified` → `onboarded` → `active` → `case_study` (or `churned`)
- Onboarding call date
- First event loaded (name, date, category mix)
- Week-1 feedback summary
- Week-4 metrics (events run, call sheets, vendors, check-ins)
- Blockers / unblocked this week
- Case-study readiness: Y/N

---

## Success Criteria (end of 90-day pilot)

- ≥ 7 of 10 pilots run at least one full event through GRID
- ≥ 5 of 10 pilots use the call sheet generator on a real event
- ≥ 3 of 10 pilots convert to paid at day 90
- ≥ 2 case studies filmed with named quote

If < 5 hit the call sheet milestone, we rebuild the onboarding flow, not the product.
