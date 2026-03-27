# Hollywood Glamour Full Rebuild — Claude Co-Work Execution Guide

**Project**: ArtistBook (Artist Booking Platform)
**Design System**: Nocturne Hollywood Glamour from Stitch
**Brand**: ArtistBook (NOT "Nocturne Elite" — that's the Stitch codename)
**Voice**: Human, direct, Indian market. No AI jargon or placeholder copy.
**Total pages**: 51 page files + 5 shared components
**Skip**: `presentations/[slug]` (stays light for print), `test/page.tsx`

---

## CRITICAL RULES

1. **The Stitch HTML is VISUAL REFERENCE ONLY** — copy the layouts, grids, glassmorphism, 3D effects, animations. Do NOT copy Stitch marketing copy ("neural network analyzes", "AI Conductor", "Nocturne Elite"). Write real product copy for India's booking marketplace.

2. **Preserve ALL business logic** — API calls, state management, imports, form handlers, error states, loading skeletons must stay exactly as-is. Only change JSX structure and Tailwind classes.

3. **Brand name is ArtistBook** — not Nocturne, not Nocturne Elite, not Glamour.

4. **Currency is INR (₹)** — not USD. Format: `₹1,50,000` not `$42,850`.

5. **Every page must have**: ambient stage glows, glass-card surfaces, bento grids (md:grid-cols-12), cinematic typography (font-display for headlines), the full glassmorphism treatment.

---

## DESIGN SYSTEM TOKENS

### Colors (use these exact values)
```
Page background:     bg-[#0e0e0f]
Surface card:        bg-[#1a191b] or glass-card class
Surface elevated:    bg-[#201f21]
Surface highest:     bg-[#262627]
Surface bright:      bg-[#2c2c2d]
Primary purple:      text-[#c39bff] / bg-[#c39bff]
Deep purple:         #8A2BE2
Cyan accent:         text-[#a1faff] / bg-[#a1faff]
Gold/secondary:      text-[#ffbf00] / bg-[#ffbf00]
Tertiary (rose):     text-[#ff8b9a]
Text primary:        text-white
Text secondary:      text-white/50
Text tertiary:       text-white/30
Border subtle:       border-white/5
Border standard:     border-white/10
Border visible:      border-white/20
```

### Typography
```
Headlines:  font-display font-extrabold tracking-tighter (Manrope)
Body:       font-sans (Inter)
Labels:     text-[10px] uppercase tracking-widest font-bold
Stats:      text-2xl to text-7xl font-black
```

### Glass Surfaces
```css
.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(64px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.glass-panel {
  background: rgba(32, 31, 31, 0.4);
  backdrop-filter: blur(40px);
}
```

### Ambient Glows (add to EVERY page)
```jsx
{/* Violet glow - top right */}
<div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
{/* Cyan glow - bottom left */}
<div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />
```

### Bento Grid Pattern
```jsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
  {/* Large card */}
  <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-[#c39bff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    {/* content */}
  </div>
  {/* Sidebar card */}
  <div className="md:col-span-4 glass-card rounded-xl p-8 border border-white/5">
    {/* content */}
  </div>
</div>
```

### Stat Mini Card
```jsx
<div className="bg-white/5 p-4 rounded-lg">
  <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Label</p>
  <p className="text-lg font-bold text-white">Value</p>
</div>
```

### Progress Bar
```jsx
<div>
  <div className="flex justify-between items-center mb-2">
    <span className="text-xs font-medium text-white">Label</span>
    <span className="text-xs text-[#a1faff]">88%</span>
  </div>
  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
    <div className="h-full bg-[#a1faff] rounded-full shadow-[0_0_8px_rgba(161,250,255,0.5)]" style={{ width: '88%' }} />
  </div>
</div>
```

### Badge
```jsx
<span className="bg-[#c39bff]/20 text-[#c39bff] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#c39bff]/30">
  Active
</span>
```

### Status Colors
```
Success:  text-green-400 / bg-green-400/15
Warning:  text-[#ffbf00] / bg-[#ffbf00]/15
Error:    text-[#ff6e84] / bg-[#ff6e84]/15
Info:     text-[#a1faff] / bg-[#a1faff]/15
```

### 3D Tilt Card (for hero sections)
```css
.tilt-card {
  perspective: 1000px;
  transform: rotateY(-12deg) rotateX(5deg);
}
```

### Voice Visualizer Bars
```jsx
<div className="flex items-end justify-center gap-1.5 h-16">
  {[40, 70, 100, 60, 85, 50, 75, 30, 90].map((h, i) => (
    <div key={i} className="w-1.5 rounded-full bg-[#c39bff] transition-all duration-500 shadow-[0_0_10px_rgba(195,155,255,0.5)]" style={{ height: `${h}%` }} />
  ))}
</div>
```

---

## PAGE-BY-PAGE REBUILD GUIDE

### BATCH 1: LANDING + PUBLIC (Already done — verify only)
- [x] `page.tsx` — Landing page (Hero + Bento + Artists + CTA + Footer)
- [x] `(public)/search/page.tsx` — Search/Discovery
- [x] `(public)/artists/[id]/page.tsx` — Artist public profile
- [ ] `(public)/presentations/[slug]/page.tsx` — SKIP (stays light)

### BATCH 2: AUTH + ONBOARDING (6 pages)

**Pattern: Fullscreen 5+7 cinematic split with glass form card**

#### `(auth)/login/page.tsx`
Layout: `grid-cols-1 lg:grid-cols-12` fullscreen. Left `lg:col-span-5` = brand headline + feature bullets. Right `lg:col-span-7` = glass form card with 3D tilt effect.
- Hero text: "Book the perfect artist for your event"
- Phone input with country code (+91)
- "Get OTP" button with gradient
- Ambient glows behind form
- Step indicator: "01 / 02"

#### `(auth)/verify/page.tsx`
Same 5+7 split. Right side = OTP input boxes (6 digits) in glass card.
- Auto-focus next input on type
- Resend timer
- Step indicator: "02 / 02"

#### `(dashboard)/artist/onboarding/page.tsx`
5+7 split. Left = "Tell us about yourself" + feature points with icons. Right = glass form card with stage name, bio, genres, city.
- Step indicator showing current/total
- AI visualizer bars in form card header
- Avatar upload circle with gradient border glow

#### `(dashboard)/artist/onboarding/social/page.tsx`
5+7 split. Left = "Connect your social profiles" + benefits list. Right = glass card with Instagram, YouTube, Spotify URL inputs.

#### `(dashboard)/client/onboarding/page.tsx`
5+7 split. Left = "Welcome to ArtistBook" + what you can do bullets. Right = glass form with company name, city, event types.

#### `(dashboard)/event-company/onboarding/page.tsx`
5+7 split. Left = "Manage events like a pro" + team/workspace features. Right = glass form with company details, team size, event volume.

### BATCH 3: ARTIST DASHBOARD PAGES (15 pages)

**Pattern: Bento hero (8+4) + content grid with glass cards**

#### `(dashboard)/artist/page.tsx` — Artist Home
Current: Has bento hero ✓. Needs: fuller Hollywood treatment.
- Hero header: Stage name + verified badge + escrow balance pill
- Bento 8+4: Performance dashboard (4 stat minis) + Backstage AI panel (progress bars + AI quote)
- Profile completion bar
- Quick actions: 2x3 grid of glass cards (Bookings, Calendar, Earnings, Profile, Intelligence, Settings)

#### `(dashboard)/artist/bookings/page.tsx` — Bookings List
Current: Has bento hero ✓. Needs: Hollywood card treatment for booking rows.
- Filter pills: All, Inquiry, Confirmed, Completed, Cancelled
- Each booking card: glass-card with left border color by status, event name, date, venue, amount, status badge
- Empty state: glass-card centered with illustration

#### `(dashboard)/artist/bookings/[id]/page.tsx` — Booking Detail
- Hero: Full-width glass-card with event name, date, venue, client name
- Bento 8+4: Left = timeline/status + details grid (date, time, venue, genre, duration). Right = sticky action card (quote amount, action buttons)
- Energy score progress bar
- Chat/messages thread below

#### `(dashboard)/artist/calendar/page.tsx`
- Hero header with month/year navigation (ChevronLeft/Right)
- Calendar grid: 7-col (Mon-Sun) with glass cells
- Booked dates: purple border + inner glow
- Available dates: subtle hover highlight
- Blocked dates: white/10 bg

#### `(dashboard)/artist/earnings/page.tsx`
- Bento 7+5: Left = total earnings card (big ₹ number + trend). Right = 3D tilt chart card
- Revenue bar chart: 5-6 bars with hover tooltips showing monthly amounts
- Transaction list below: glass cards with amount, date, booking reference, status

#### `(dashboard)/artist/financial/page.tsx` — Escrow Wallet
Match Stitch `escrow_wallet_hollywood_glamour`:
- Bento 7+5: Left = escrow balance (text-7xl font-black) + pending/settled/refunded stats. Right = 3D tilt market trends chart
- Transaction table: nocturne-table with left-border status colors
- Right sidebar: donut allocation chart (SVG) + payout settings

#### `(dashboard)/artist/profile/page.tsx`
- Hero: Avatar (w-32 h-32 rounded-full with gradient border) + stage name + edit button
- Bento grid: Bio card + genres card + media gallery (3-col grid with aspect-square images)
- Pricing card, availability card, rider requirements card

#### `(dashboard)/artist/intelligence/page.tsx` — Career Intelligence Hub
Match Stitch `refined_ai_insights_dashboard`:
- Bento 8+4: Left = career overview (trust score, profile completion, booking rate progress bars). Right = AI advisor card with quote
- Market position card, demand trends card, pricing brain card
- Each with progress bars and stat minis

#### `(dashboard)/artist/intelligence/gig-advisor/page.tsx`
- Bento 8+4: Left = recommended gigs list (glass cards with match %). Right = market insights
- Each gig card: event type, city, date range, budget range, match score progress bar

#### `(dashboard)/artist/intelligence/reputation/page.tsx`
- Large trust score circle (SVG donut) centered
- Breakdown: behavioral (70%) vs stated (30%) split bars
- Recent review snippets in glass cards

#### `(dashboard)/artist/seasonal/page.tsx`
- Bar chart showing 12 months of demand
- Current season highlight card
- Pricing recommendation card with suggested rates

#### `(dashboard)/artist/gamification/page.tsx`
- Achievement grid: 3-col glass cards with icon + badge name + progress
- Active streaks section
- Points/level display

#### `(dashboard)/artist/marketing/page.tsx`
- Bento 8+4: Left = marketing tools overview. Right = social stats
- Share cards, promo link generator, media kit download

#### `(dashboard)/artist/settings/backup/page.tsx`
- Glass card with toggle switches for notifications, privacy, data export
- Each section separated by nocturne-divider

### BATCH 4: CLIENT DASHBOARD PAGES (11 pages)

#### `(dashboard)/client/page.tsx` — Client Home
- Hero: Welcome + company name + quick stats (bookings, shortlists, upcoming)
- Bento 8+4: Quick actions grid + recent activity feed
- Upcoming events timeline

#### `(dashboard)/client/bookings/page.tsx` — Bookings List
- Filter pills by status
- Booking cards: glass-card with artist photo, event name, date, amount, status badge

#### `(dashboard)/client/bookings/[id]/page.tsx` — Booking Detail
Match Stitch `booking_inquiry_management`:
- Hero image: aspect-[21/9] with gradient overlay
- Bento 7+5: Left = booking details + timeline. Right = sticky payment/action card
- Artist card with photo, rating, genres
- Price breakdown list

#### `(dashboard)/client/bookings/[id]/pay/page.tsx` — Payment Flow
Match Stitch `fund_escrow_confirm_booking`:
- Bento 7+5: Left = booking summary + artist image + detail grid. Right = sticky funding card
- Payment method radio cards (UPI, Card, Net Banking)
- Amount breakdown with escrow explanation

#### `(dashboard)/client/bookings/[id]/confirmation/page.tsx` — Booking Confirmed
Match Stitch `booking_confirmed`:
- Centered success: Large checkmark in gradient circle with glow
- "Booking Confirmed!" headline (text-4xl md:text-6xl font-black)
- Bento 7+5: Transaction summary + next steps checklist
- CTA buttons: View Booking, Browse More Artists

#### `(dashboard)/client/payments/page.tsx`
- Payment history table in nocturne-table
- Filter by status, date range
- Each row: booking ref, artist, amount, date, status badge

#### `(dashboard)/client/shortlists/page.tsx`
- Grid of shortlist collections
- Each collection: glass-card with name, artist count, created date
- Click into: artist cards within that shortlist

#### `(dashboard)/client/recommendations/page.tsx`
- AI-powered suggestions grid
- Artist cards: aspect-[3/4] poster style with grayscale-to-color hover
- Match percentage badge, genre tags

#### `(dashboard)/client/substitutions/page.tsx`
- Emergency banner: glass-card with warning icon + amber border
- Available substitute artists list
- Match score + availability status per artist

### BATCH 5: WORKSPACE PAGES (7 pages)

#### `(dashboard)/client/workspace/page.tsx` — Workspace List
- Grid of workspace cards: company logo, name, member count, event count
- "Create Workspace" CTA button

#### `(dashboard)/client/workspace/[id]/page.tsx` — Workspace Detail
Match Stitch `event_dashboard_hollywood_cinematic`:
- Cinematic header: workspace name + member avatars + stat pills
- Bento 8+4: Booking pipeline (kanban-style status columns) + AI voice card
- Recent activity feed

#### `(dashboard)/client/workspace/[id]/analytics/page.tsx`
Match Stitch `event_company_analytics_dashboard`:
- Bento 8+4: Revenue chart (bar chart) + conversion funnel
- Stat minis: Total bookings, Average deal size, Top genre, Top city
- Monthly trend line

#### `(dashboard)/client/workspace/[id]/commission/page.tsx`
- Commission rate settings in glass card
- Agent commission history table
- Total paid out stat

#### `(dashboard)/client/workspace/[id]/presentations/page.tsx`
Match Stitch `presentation_builder_hollywood_glamour`:
- Create presentation form: select artists, add notes
- Generated presentations list with preview thumbnails

#### `(dashboard)/client/workspace/[id]/team/page.tsx`
- Team members list: avatar, name, email, role badge
- Invite member form: glass card with email input + role select
- Role management (admin, member, viewer)

#### `(dashboard)/client/workspace/[id]/settings/page.tsx`
- Workspace settings form: name, logo, description
- Danger zone: leave workspace, delete workspace (with confirmation)

### BATCH 6: AGENT PAGES (6 pages)

#### `(dashboard)/agent/page.tsx` — Agent Home
Current: Has full bento layout ✓. Verify Hollywood treatment.

#### `(dashboard)/agent/bookings/page.tsx`
- Concierge booking form (glass card) + bookings list
- Each booking: artist name, client, date, commission amount

#### `(dashboard)/agent/roster/page.tsx`
- Artist roster grid: glass cards with artist photo, name, genres, trust score
- Add artist button + search
- Earnings per artist stat

#### `(dashboard)/agent/commissions/page.tsx`
- Commission history table: nocturne-table
- Filter pills: All, Pending, Paid
- Total earned card

#### `(dashboard)/agent/recommendations/page.tsx`
- Recommended artists: poster-style cards (aspect-[3/4])
- Match percentage, genre tags

#### `(dashboard)/agent/onboarding/page.tsx`
5+7 split: Left = "Become an ArtistBook Agent" + benefits. Right = glass form with agency name, experience, specialization.

### BATCH 7: EVENT COMPANY (2 pages)

#### `(dashboard)/event-company/page.tsx` — EC Home
Current: Has full bento layout ✓. Verify Hollywood treatment.

#### `(dashboard)/event-company/onboarding/page.tsx`
Covered in Batch 2.

### BATCH 8: SHARED PAGES (8 pages)

#### `(dashboard)/gigs/page.tsx` — Gig Marketplace
- Search bar + filter pills (genre, city, budget)
- Gig cards: glass-card with event type, date, city, budget, applicant count
- "Apply" CTA on each card

#### `(dashboard)/gigs/[id]/page.tsx` — Gig Detail
- Hero with event name + details
- Bento 7+5: Left = full description + requirements. Right = sticky apply card
- Applicant list (if artist is owner)

#### `(dashboard)/notifications/page.tsx`
- Notification list: glass cards grouped by date
- Each: icon + title + description + timestamp
- Mark read/unread toggle

#### `(dashboard)/settings/page.tsx`
- Settings sections in glass cards: Account, Notifications, Preferences
- Toggle switches for each setting
- Separated by nocturne-divider

#### `(dashboard)/voice/page.tsx` — Voice Dashboard
- Full-page voice interface
- Session history sidebar
- Main area: large transcript display + action results

#### `(dashboard)/admin/page.tsx` — Admin Dashboard
Current: Has 7 tab panels with bento layouts ✓. Verify each tab has Hollywood treatment.

#### `help/page.tsx`
- FAQ accordion: glass cards that expand on click
- Search bar at top
- Contact section at bottom

#### `privacy/page.tsx` + `terms/page.tsx`
- Legal text pages: glass-card container with proper heading hierarchy
- Dark background, white text, purple accent links

### BATCH 9: SHARED COMPONENTS (5 files)

#### `components/layout/DashboardLayout.tsx`
- Side nav with role-based menu items
- Top bar with notification bell, avatar, logout
- Mobile bottom nav
- Ensure all use Nocturne tokens

#### `components/layout/Navbar.tsx`
Already rebuilt ✓. Brand = ArtistBook.

#### `components/layout/Footer.tsx`
Already rebuilt ✓. Brand = ArtistBook.

#### `components/voice/VoiceAssistant.tsx`
- Curate voices to best English + best Hindi only (2 options, simple toggle)
- Remove long dropdown
- Keep existing functionality

#### `error.tsx` + `not-found.tsx`
- Centered glass card with error/404 message
- Ambient glows behind
- "Go Home" CTA button

---

## EXECUTION ORDER

1. Start with Batch 2 (Auth + Onboarding) — these are entry points
2. Then Batch 3 (Artist Dashboard) — highest traffic
3. Then Batch 4 (Client Dashboard) — second highest
4. Then Batch 5 (Workspace)
5. Then Batch 6 (Agent)
6. Then Batch 8 (Shared pages)
7. Then Batch 9 (Shared components)
8. Final: build check + deploy

## VERIFICATION

After ALL pages are done:
```bash
# 1. Check no light-theme classes remain
grep -rn "bg-white\b\|bg-neutral-\|text-neutral-\|border-neutral-\|bg-gray-\|text-gray-\|border-gray-" apps/web/src/app --include="*.tsx" | grep -v "presentations/\[slug\]"

# 2. Build succeeds
cd apps/web && pnpm build

# 3. Visual check every route
pnpm dev
```

---

## DONE CRITERIA

- [ ] Every page has ambient stage glows
- [ ] Every page uses glass-card for containers
- [ ] Every page uses bento grids (md:grid-cols-12)
- [ ] Every page uses font-display for headlines
- [ ] Every page uses Nocturne color tokens
- [ ] Auth/Onboarding pages use 5+7 cinematic split
- [ ] Dashboard pages use 8+4 bento hero
- [ ] All status badges use inner-glow pattern
- [ ] All buttons use btn-nocturne-primary/secondary
- [ ] All inputs use input-nocturne
- [ ] All tables use nocturne-table
- [ ] Zero light-theme classes (except presentations/[slug])
- [ ] Brand name is "ArtistBook" everywhere
- [ ] Copy is human, direct, Indian market — no AI jargon
- [ ] Build passes with zero errors
- [ ] Voice assistant has English + Hindi voice toggle only
