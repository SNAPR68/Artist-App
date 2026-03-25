# Nocturne Hollywood — Co-Work Execution Guide (Phases 1-3)

## Pre-requisites (Already Done)
Phase 0 is complete. The following tokens, classes, and fonts are already available:
- `nocturne.*` color tokens in `tailwind.config.ts`
- `glass-card`, `glass-panel`, `btn-nocturne-*`, `input-nocturne`, `badge-nocturne`, `text-gradient-nocturne` CSS classes in `globals.css`
- `theme-nocturne` CSS class with dark CSS variables
- `DashboardLayout` already applies `theme-nocturne bg-nocturne-base text-nocturne-text-primary`
- Manrope font available via `font-display` Tailwind class

## Design Reference
Read `NOCTURNE_DESIGN_SYSTEM.md` for the full spec. Key rules:
- **Background:** `bg-nocturne-base` (#0E0E0F)
- **Cards:** use `glass-card` class (or `bg-nocturne-glass-card backdrop-blur-3xl border border-nocturne-border rounded-4xl shadow-nocturne-card`)
- **Text:** `text-nocturne-text-primary` (white), `text-nocturne-text-secondary` (65% white), `text-nocturne-text-tertiary` (40% white)
- **Primary action:** `btn-nocturne-primary` (purple gradient with glow)
- **Accent color:** `text-nocturne-accent` (#A1FAFF cyan)
- **Headings:** use `font-display` (Manrope)
- **Animations:** `animate-tilt-in` on card mount, `animate-glow-pulse` on interactive elements

---

## Phase 1: Screen-by-Screen Redesign

Execute each screen in order. After each screen, run `pnpm --filter @artist-booking/web build` to verify no breakage.

### Screen 1: DashboardLayout (Sidebar + Top Bar)
**File:** `apps/web/src/components/layout/DashboardLayout.tsx`

The layout wrapper already has `theme-nocturne bg-nocturne-base`. Now restyle the internal elements:

1. **Desktop top bar** (line ~130): Change from `bg-white/80 backdrop-blur-lg border-b border-neutral-200` to `bg-nocturne-surface/80 backdrop-blur-3xl border-b border-nocturne-border-subtle`
2. **Logo text**: Change to `text-gradient-nocturne font-display font-bold`
3. **Nav items**: Change active state from `text-primary-600 border-primary-500 bg-primary-50` to `text-nocturne-accent border-l-2 border-nocturne-primary bg-nocturne-primary-light`
4. **Inactive nav items**: `text-nocturne-text-secondary hover:text-nocturne-text-primary hover:bg-nocturne-glass-panel`
5. **Mobile bottom nav**: Change from `bg-white border-t border-neutral-200` to `bg-nocturne-surface/90 backdrop-blur-3xl border-t border-nocturne-border-subtle`
6. **Main content area**: Already has dark bg. Just ensure children render on dark background.

### Screen 2: Client Dashboard
**File:** `apps/web/src/app/(dashboard)/client/page.tsx`

1. Replace all `bg-white` cards with `glass-card` class
2. Stat cards: `glass-card p-6` with icon in `text-nocturne-accent`, number in `text-nocturne-text-primary font-display text-h2`, label in `text-nocturne-text-secondary`
3. Add `animate-tilt-in` to cards with staggered `animation-delay`
4. Buttons: `btn-nocturne-primary` for main CTA, `btn-nocturne-secondary` for secondary

### Screen 3: Event Company Dashboard
**File:** `apps/web/src/app/(dashboard)/event-company/page.tsx`

Same pattern as Screen 2. This page has workspace stats + quick actions.
1. All cards → `glass-card glass-card-hover`
2. Voice tip section → `glass-panel rounded-4xl p-6`
3. Quick action buttons → `btn-nocturne-secondary`

### Screen 4: Artist Dashboard
**File:** `apps/web/src/app/(dashboard)/artist/page.tsx`

1. All stat cards → `glass-card`
2. Earnings/bookings numbers → `font-display text-nocturne-text-primary`
3. Status badges → `badge-nocturne`
4. Charts/graphs → ensure dark background, cyan/purple accent colors

### Screen 5: Admin Dashboard
**File:** `apps/web/src/app/(dashboard)/admin/page.tsx`

1. Tab navigation → glass-panel with active tab using `bg-nocturne-primary-light text-nocturne-accent`
2. All table rows → `hover:bg-nocturne-glass-panel` with `border-b border-nocturne-border-subtle`
3. Dispute resolution buttons → `btn-nocturne-primary` for approve, `btn-nocturne-secondary` for dismiss

### Screen 6: Search Page
**File:** `apps/web/src/app/(public)/search/SearchPageClient.tsx`

This is a public page but should also get the dark treatment:
1. Wrap in `theme-nocturne` div with `bg-gradient-nocturne-hero min-h-screen`
2. Search bar → `input-nocturne` with larger padding, mic icon in `text-nocturne-accent`
3. "Find Your Perfect Artist" heading → `text-gradient-nocturne font-display text-hero`
4. Filter sidebar → `glass-panel rounded-4xl p-6`
5. Artist result cards → `glass-card glass-card-hover` with cover image, badges, trust score
6. Genre/city filter chips → `badge-nocturne`

### Screen 7: Artist Profile Page
**File:** `apps/web/src/app/(public)/artists/[id]/ArtistPageClient.tsx`

1. Wrap in `theme-nocturne` div with `bg-nocturne-base`
2. Hero section: full-bleed cover image with `bg-gradient-to-t from-nocturne-base` overlay
3. Name → `font-display text-hero text-nocturne-text-primary`
4. Genre badges → `badge-nocturne`
5. Bio, Gallery, Pricing, Reviews sections → each in `glass-card p-8`
6. "Book This Artist" CTA → `btn-nocturne-primary` with `animate-glow-pulse`
7. Trust score stars → `text-nocturne-gold`

### Screen 8: Voice Assistant
**File:** `apps/web/src/components/voice/VoiceAssistant.tsx`

Rebrand to "Backstage AI":
1. Mini widget: `bg-nocturne-glass-floating backdrop-blur-3xl rounded-full animate-glow-pulse` with cyan waveform icon
2. Expanded overlay: `bg-nocturne-base/95 backdrop-blur-4xl` full screen
3. Waveform bars: use `.voice-bar` class (cyan bars)
4. User messages: `bg-gradient-nocturne rounded-2xl` bubble
5. Assistant messages: `glass-card rounded-2xl`
6. Suggestion chips: `badge-nocturne` style
7. Text input: `input-nocturne` with rounded-pill
8. Brand name: "Backstage AI" in `text-gradient-nocturne`

### Screen 9: Artist Onboarding
**File:** `apps/web/src/app/(dashboard)/artist/onboarding/page.tsx`

1. Wrap in `theme-nocturne bg-nocturne-base min-h-screen`
2. Step cards → `glass-card`
3. Progress indicator → purple gradient bar
4. Input fields → `input-nocturne`
5. Continue button → `btn-nocturne-primary`
6. Welcome heading → `font-display text-gradient-nocturne`

### Screen 10: Client/Event Company Onboarding
**File:** `apps/web/src/app/(dashboard)/client/onboarding/page.tsx` and `apps/web/src/app/(dashboard)/event-company/onboarding/page.tsx`

Same pattern as Screen 9.

---

## Phase 2: Shared Component Updates

After all screens are done, update these shared components to support Nocturne:

### 2.1 Booking Status Badges
**File:** Any component rendering booking state badges
- Use `badge-nocturne` base with status-specific colors:
  - Confirmed: `bg-nocturne-success/15 text-nocturne-success`
  - Pending: `bg-nocturne-warning/15 text-nocturne-warning`
  - Cancelled: `bg-nocturne-error/15 text-nocturne-error`

### 2.2 Loading States
- Skeleton: Change shimmer gradient to `bg-gradient-to-r from-nocturne-surface via-nocturne-surface-2 to-nocturne-surface`
- Spinner: `border-nocturne-primary border-t-transparent`

### 2.3 Toast/Notifications
- Success: `glass-card` with `border-l-4 border-nocturne-success`
- Error: `glass-card` with `border-l-4 border-nocturne-error`
- Info: `glass-card` with `border-l-4 border-nocturne-info`

### 2.4 Modal/Dialog
- Backdrop: `bg-black/60 backdrop-blur-lg`
- Content: `glass-card p-8`

---

## Phase 3: NEW Marketing Dashboard Page

**Create:** `apps/web/src/app/(dashboard)/artist/marketing/page.tsx`

This is a new page — AI Marketing Tools for artists:
- Glass-card grid with:
  - "Social Media Reach" chart card
  - "Profile Views" stat card
  - "Booking Conversion" radial progress
  - "AI Recommendations" list
- All cards use `glass-card animate-tilt-in`
- Charts use cyan (`#A1FAFF`) and purple (`#8A2BE2`) colors
- Page title: "Marketing Intelligence" in `font-display text-gradient-nocturne`

---

## Build & Deploy

After all phases:
```bash
pnpm --filter @artist-booking/web build
git add -A
git commit -m "Nocturne Hollywood: Phase 1-3 screen redesign"
git push origin main
npx vercel --prod --yes
```

## Verification Checklist
- [ ] All dashboard pages render on dark background
- [ ] Glass cards have visible borders and blur
- [ ] Text is readable (white on dark)
- [ ] Buttons glow on hover
- [ ] Voice widget has cyan waveform
- [ ] Search page has gradient hero background
- [ ] Artist profile has full-bleed hero with overlay
- [ ] No light-theme artifacts (white backgrounds, dark text on dark bg)
- [ ] Mobile responsive — bottom nav is dark
- [ ] Manrope font loads for headings
