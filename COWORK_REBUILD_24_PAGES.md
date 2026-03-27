# Co-Work Handoff: Rebuild 24 Pages to Stitch Hollywood Glamour

## MISSION
Rebuild 24 pages in `apps/web/src/app/` to match the **Stitch Nocturne Hollywood** design system. Each page needs a **bento grid layout** with glassmorphism cards, cinematic glows, and proper visual hierarchy — NOT just dark class swaps.

## CRITICAL RULES
1. **Preserve ALL business logic** — API calls, state management, imports, hooks, types. Only change JSX structure and Tailwind classes.
2. **Use ArtistBook brand copy** — NOT Stitch placeholder text. This is an Indian artist booking platform, not "Nocturne Elite".
3. **Bento grid pattern**: Every dashboard page gets a `grid grid-cols-1 md:grid-cols-12 gap-6` hero with `md:col-span-8` main card + `md:col-span-4` sidebar card.
4. **Glass card pattern**: `glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden` with ambient glow div inside.
5. **Cinematic glow**: `<div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />`
6. **No placeholder AI visualizer bars** — the voice assistant is the floating Backstage AI widget, not inline content.
7. **Status colors**: green-400 (success), yellow-400 (pending), red-400 (error), [#a1faff] (info/AI).

## STITCH REFERENCE DESIGNS
All reference HTML lives in: `stitch_product_requirements_document (2)/stitch_product_requirements_document/`

| Page | Reference Folder | Layout Pattern |
|------|-----------------|----------------|
| Artist Profile | `artist_portfolio_hollywood_glamour` | 3-col staggered poster gallery (3:4 aspect, offset cols), 4-col bento below |
| Artist Booking Detail | `booking_inquiry_management` | 8+4 hero with stats, 7+5 body with inquiry list + mini calendar |
| Escrow/Financial | `escrow_wallet_hollywood_glamour` | 7+5 balance card + tilted chart, 8+4 transactions + donut chart |
| AI Discovery/Search | `ai_artist_discovery` | Full-width search bar, 8+4 hero result + vertical card, 3-col grid below |
| Booking Payment | `fund_escrow_confirm_booking_1` | 7+5 split: artist details left, payment form right (sticky) |
| Booking Confirmed | `booking_confirmed` | Centered success animation, 7+5 transaction summary + next steps |
| Onboarding Welcome | `onboarding_welcome_hollywood_glamour` | 5+7 split: editorial copy left, 3D glass card right |
| Onboarding Media | `onboarding_media_niche` | 7+5 hero, 2-col action cards, 3-col media processing grid |
| Artist Management | `artist_management_hollywood_glamour` | 8+4 hero contract + AI panel, 5+7 media library + revenue chart |

---

## PAGES TO REBUILD (24 total)

### BATCH 1: Artist Dashboard Sub-Pages (8 pages)

#### 1. `(dashboard)/artist/profile/page.tsx`
**Stitch ref**: `artist_portfolio_hollywood_glamour`
**Layout**:
- Hero: 12-col, `md:col-span-8` profile card with avatar, name, bio, genres + `md:col-span-4` stats card (trust score, total bookings, rating)
- Body: 3-col grid of profile sections (media gallery, pricing, availability) as glass cards
- Each card: `glass-card rounded-xl p-6 border border-white/5`
- Profile avatar: `w-24 h-24 rounded-full border-2 border-[#c39bff]/30`

#### 2. `(dashboard)/artist/bookings/[id]/page.tsx`
**Stitch ref**: `booking_inquiry_management`
**Layout**:
- Hero: 8+4 bento — main card with event name, date, venue, status badge + sidebar with escrow amount and payment status
- Body: 7+5 split — timeline/activity feed left + client info card right
- Status badges: `px-3 py-1 rounded-full text-xs font-bold` with status-colored bg (green-400/15, yellow-400/15, red-400/15)

#### 3. `(dashboard)/artist/calendar/page.tsx`
**Layout**:
- Hero: 8+4 bento — month title + navigation + "X events this month" stats card
- Body: Full-width calendar grid (7-col for days, glass-card cells)
- Event dots on dates: colored circles matching booking status
- Mini sidebar: upcoming events list

#### 4. `(dashboard)/artist/gamification/page.tsx`
**Layout**:
- Hero: 8+4 bento — level/XP progress bar + streak counter card
- Body: 3-col grid of achievement badges as glass cards
- Each badge: icon + title + description + earned/locked state
- Locked badges: `opacity-40 grayscale`

#### 5. `(dashboard)/artist/intelligence/gig-advisor/page.tsx`
**Layout**:
- Hero: 8+4 bento — AI recommendations summary + confidence meter card
- Body: list of gig recommendations as glass-card rows with match % progress bars
- Each row: event name, city, date range, estimated pay, match score bar

#### 6. `(dashboard)/artist/intelligence/reputation/page.tsx`
**Layout**:
- Hero: 8+4 bento — trust score big number (70% behavioral / 30% stated) + trend sparkline card
- Body: 7+5 split — factor breakdown list (on-time rate, cancellation rate, response time, review avg) + recent reviews

#### 7. `(dashboard)/artist/marketing/page.tsx`
**Layout**:
- Hero: 8+4 bento — marketing overview + social reach card
- Body: 3-col grid — share profile card, generate poster card, promo analytics card

#### 8. `(dashboard)/artist/seasonal/page.tsx`
**Layout**:
- Hero: 8+4 bento — current demand level + city comparison card
- Body: Full-width demand heatmap (12 months x cities), glass-card rows for seasonal insights

---

### BATCH 2: Client Sub-Pages (8 pages)

#### 9. `(dashboard)/client/bookings/[id]/page.tsx`
**Stitch ref**: `booking_inquiry_management`
**Layout**: Same as artist booking detail but from client perspective — show artist info instead of client info in sidebar

#### 10. `(dashboard)/client/bookings/[id]/pay/page.tsx`
**Stitch ref**: `fund_escrow_confirm_booking_1`
**Layout**:
- 7+5 split
- Left (7-col): Artist hero image (aspect-video with gradient overlay), 2-col detail grid (date, venue, event type, duration), price breakdown table
- Right (5-col, sticky): Payment method selector (radio cards: UPI/Bank/Card), "Fund Escrow" CTA button with purple glow shadow, trust badges row

#### 11. `(dashboard)/client/bookings/[id]/confirmation/page.tsx`
**Stitch ref**: `booking_confirmed`
**Layout**:
- Centered: animated checkmark with pulsing glow aura (`w-32 h-32 rounded-full bg-gradient-to-br from-[#c39bff] to-[#a1faff] flex items-center justify-center shadow-[0_0_50px_rgba(195,155,255,0.4)]`)
- Below: "Booking Confirmed!" headline (text-5xl)
- 7+5 bento: transaction summary card (amount, booking ID, date, status) + "What happens next" card (3-item list: Artist Notified, Contract Generated, WhatsApp Confirmation)
- 3 CTA buttons row: "View Booking" (primary), "Browse More Artists" (outline), "Download Receipt" (text link)

#### 12. `(dashboard)/client/payments/page.tsx`
**Stitch ref**: `escrow_wallet_hollywood_glamour`
**Layout**:
- Hero: 7+5 bento — total spent card with big number + payment method summary card
- Body: Full-width transaction list as glass-card rows with left border color coding (green = settled, yellow = in escrow, red = refunded)

#### 13. `(dashboard)/client/shortlists/page.tsx`
**Layout**:
- Hero: 8+4 bento — "Your Shortlists" + create new shortlist card
- Body: Grid of shortlist cards (2-col or 3-col), each showing artist count, last updated, thumbnail stack

#### 14. `(dashboard)/client/recommendations/page.tsx`
**Layout**:
- Hero: 8+4 bento — "Recommended for you" + recommendation engine info card
- Body: 3-col grid of artist recommendation cards (3:4 poster aspect, grayscale hover effect, match % badge)

#### 15. `(dashboard)/client/substitutions/page.tsx`
**Layout**:
- Hero: 8+4 bento — emergency header (red accent) + active substitution request card
- Body: List of substitution matches as glass-card rows with availability indicators

#### 16. `(dashboard)/client/workspace/page.tsx`
**Layout**:
- Hero: 8+4 bento — "Your Workspaces" count + create workspace CTA card
- Body: 2-col grid of workspace cards with team member avatars, event count, last activity

---

### BATCH 3: Onboarding Flows (4 pages)

#### 17. `(dashboard)/artist/onboarding/page.tsx`
**Stitch ref**: `onboarding_welcome_hollywood_glamour`
**Layout**:
- Full-screen centered, NO sidebar
- 5+7 split: Left (editorial copy) — step badge "Step 1 of 3", headline "Welcome to ArtistBook", description, feature bullets | Right — 3D glass card with profile form (name, stage name, city, category dropdowns)
- Background: radial gradient glows (purple top-left, cyan bottom-right)
- CTA: "Continue" gradient button at bottom of form card

#### 18. `(dashboard)/artist/onboarding/social/page.tsx`
**Stitch ref**: `onboarding_media_niche`
**Layout**:
- Similar to welcome but step "2 of 3"
- 7+5 hero with headline + social platform cards
- 2-col action grid: "Connect Instagram" card + "Connect YouTube" card
- 3-col media preview grid showing imported content

#### 19. `(dashboard)/client/onboarding/page.tsx`
**Layout**:
- Same 5+7 split pattern as artist onboarding
- Left: "Set up your event company profile" copy
- Right: glass card with company name, city, event types checkboxes, team size
- Background glows

#### 20. `(dashboard)/event-company/onboarding/page.tsx`
**Layout**: Same as client onboarding (they share the same flow)

---

### BATCH 4: Discovery + Public Pages (4 pages)

#### 21. `(public)/artists/[id]/page.tsx`
**Stitch ref**: `artist_portfolio_hollywood_glamour`
**Layout**:
- Full-width hero: artist cover image (aspect-[21/9]) with gradient-to-top overlay, artist name overlay at bottom
- Below hero: 8+4 split — Left: tabbed content (About, Media, Reviews, Rider) + Right: sticky booking card (price, availability calendar, "Book Now" CTA)
- Media tab: 3-col gallery grid (3:4 aspect, grayscale hover)
- Reviews tab: glass-card review rows with star ratings
- Rider tab: equipment checklist

#### 22. `(public)/search/page.tsx` (already has SearchPageClient but needs bento results)
**Stitch ref**: `ai_artist_discovery`
**Layout**:
- Full-width search bar (glass pill with icon + city dropdown + CTA)
- Filter chips row (genre, city, budget, rating)
- Results bento: First result as 8+4 hero card (large image + details), remaining as 3-col grid (3:4 poster cards with grayscale-to-color hover)

#### 23. `(dashboard)/gigs/page.tsx`
**Layout**:
- Hero: 8+4 bento — "Open Gigs" marketplace header + post gig CTA card
- Body: List of gig cards as glass-card rows with budget, date, city, genre, applicant count

#### 24. `(dashboard)/admin/page.tsx`
**Layout**:
- Hero: 8+4 bento — platform stats (total users, bookings, revenue) + system health card
- Each tab panel below should use bento grids:
  - Users tab: data table with glass styling (`nocturne-table` class)
  - Bookings tab: same table pattern
  - Payments tab: 7+5 split with total revenue card + recent transactions
  - Disputes tab: list with status badges
  - Intelligence tab: 3-col metric cards

---

## EXECUTION TEMPLATE

For EVERY page, follow this exact pattern:

```tsx
// Step 1: Read the existing page
// Step 2: Identify all imports, hooks, API calls, types, state — PRESERVE THEM
// Step 3: Replace the return JSX with bento layout:

return (
  <div className="space-y-6">
    {/* ─── Bento Hero ─── */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in-up">
      {/* Main card (8-col) */}
      <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">SECTION LABEL</span>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-2">Page Title</h1>
          <p className="text-white/40 text-sm">Subtitle description</p>
          {/* Stats row */}
          <div className="flex gap-8 mt-6">
            <div>
              <p className="text-white/40 text-xs mb-1">Metric</p>
              <p className="text-2xl font-bold text-white">Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar card (4-col) */}
      <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 border-l-4 border-l-[#c39bff] flex flex-col justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">SIDEBAR TITLE</h3>
        {/* Sidebar content */}
      </div>
    </div>

    {/* ─── Body Content ─── */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Main content area */}
      <div className="md:col-span-7 space-y-4">
        {/* Content cards */}
      </div>
      {/* Side panel */}
      <div className="md:col-span-5 space-y-4">
        {/* Side cards */}
      </div>
    </div>
  </div>
);
```

## CSS CLASSES REFERENCE

```
glass-card               → bg-white/6 backdrop-blur-[64px] border border-white/15 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]
glass-panel              → bg-white/4 backdrop-blur-[32px] border border-white/8
btn-nocturne-primary     → Purple gradient CTA with glow
btn-nocturne-secondary   → Transparent with white/15 border
input-nocturne           → Dark input with white/6 bg, purple focus ring
badge-nocturne           → Purple/15 bg, cyan text, pill shape
nocturne-chip            → Semi-transparent pill tag
nocturne-divider         → 1px rgba white 6%
nocturne-table           → Dark table with subtle row borders
text-gradient-nocturne   → Purple-to-cyan gradient text
```

## STATUS BADGE PATTERN
```tsx
const STATUS_STYLES: Record<string, string> = {
  inquiry: 'bg-blue-400/15 text-blue-400',
  quoted: 'bg-purple-400/15 text-purple-400',
  negotiating: 'bg-yellow-400/15 text-yellow-400',
  confirmed: 'bg-green-400/15 text-green-400',
  pre_event: 'bg-cyan-400/15 text-cyan-400',
  completed: 'bg-emerald-400/15 text-emerald-400',
  settled: 'bg-emerald-400/15 text-emerald-400',
  cancelled: 'bg-red-400/15 text-red-400',
  disputed: 'bg-orange-400/15 text-orange-400',
};
```

## ONBOARDING TEMPLATE (for all 4 onboarding pages)
```tsx
return (
  <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center p-6 relative overflow-hidden">
    {/* Background glows */}
    <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
    <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

    <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
      {/* Left: Editorial copy */}
      <div className="md:col-span-5 space-y-6">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#a1faff] text-xs font-bold tracking-widest uppercase">
          Step X of Y
        </span>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white leading-tight">
          Headline
        </h1>
        <p className="text-white/50 text-lg leading-relaxed">Description</p>
      </div>

      {/* Right: Form card */}
      <div className="md:col-span-7">
        <div className="glass-card rounded-3xl p-8 md:p-10 border border-white/10">
          {/* Form fields with input-nocturne class */}
        </div>
      </div>
    </div>
  </div>
);
```

## ARTIST PUBLIC PROFILE TEMPLATE
```tsx
// Hero: full-width cover image
<div className="relative aspect-[21/9] w-full overflow-hidden">
  <Image src={artist.cover_url} alt="" fill className="object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f] via-transparent to-transparent" />
  <div className="absolute bottom-8 left-8 z-10">
    <h1 className="text-5xl font-display font-extrabold text-white">{artist.stage_name}</h1>
    <p className="text-white/50 mt-2">{artist.genres} • {artist.base_city}</p>
  </div>
</div>

// Below: 8+4 split
<div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto px-6 -mt-8 relative z-10">
  <div className="md:col-span-8">
    {/* Tabbed content: About, Media, Reviews, Rider */}
  </div>
  <div className="md:col-span-4">
    {/* Sticky booking card */}
    <div className="sticky top-24 glass-card rounded-xl p-6 border border-white/5">
      <p className="text-3xl font-bold text-white">₹{price}</p>
      <button className="btn-nocturne-primary w-full mt-4">Book Now</button>
    </div>
  </div>
</div>
```

## VERIFICATION
After converting all 24 pages:
```bash
# 1. Build succeeds
cd apps/web && pnpm build

# 2. Every page has bento grid
grep -rn "col-span-8\|col-span-7" --include="*.tsx" apps/web/src/app/ | wc -l
# Expected: 30+ matches

# 3. No remaining light classes
grep -rn "bg-white[^/]" --include="*.tsx" apps/web/src/app/ | grep -v presentations | wc -l
# Expected: 0
```

## DONE CRITERIA
- [ ] All 24 pages have 12-col bento hero grids
- [ ] All use glass-card + ambient glow pattern
- [ ] Onboarding pages use fullscreen 5+7 split with background glows
- [ ] Artist public profile has cover hero + 8+4 tabbed layout
- [ ] Search results use bento grid (hero card + 3-col grid)
- [ ] All business logic preserved (API calls, state, hooks, types)
- [ ] Build passes with no errors
- [ ] Brand copy is ArtistBook (NOT Nocturne Elite or Stitch placeholder)
