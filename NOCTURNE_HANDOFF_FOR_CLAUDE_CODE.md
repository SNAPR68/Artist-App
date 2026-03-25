# Nocturne Elite — Claude Code Implementation Handoff

This document tells you (Claude Code) exactly how to implement the "Nocturne Hollywood" redesign across the Artist Booking Platform frontend. Read `NOCTURNE_DESIGN_SYSTEM.md` first — it is the canonical reference for every token, color, surface, and animation rule.

---

## Context

The platform is being redesigned from a light-themed (violet/zinc, shadcn-inspired) UI to a dark, cinematic "Nocturne Hollywood" aesthetic featuring glassmorphism, 3D transforms, and a voice-first AI interaction model called "Backstage AI."

The Stitch project at `https://stitch.withgoogle.com/projects/268937186186631956` contains 10 screen designs. We could not extract the HTML/Tailwind code programmatically (Stitch renders in a sandboxed canvas). The screen inventory and design spec below are derived from the blueprint document and the design system.

**Monorepo root:** `artist-booking-platform/`
**Web app:** `apps/web/`
**Key config files:** `tailwind.config.ts`, `src/styles/globals.css`, `src/app/layout.tsx`

---

## Phase 0: Foundation (Do First)

### 0.1 Update Tailwind Config

File: `apps/web/tailwind.config.ts`

The current config uses a light-first palette (white backgrounds, zinc neutrals, violet primary). You need to transform it to the Nocturne dark-first system while preserving backwards compatibility for any pages that still use the old tokens.

**Changes required:**

1. **Add the `nocturne` color namespace** (do NOT delete existing colors — add alongside):

```typescript
nocturne: {
  base: '#0E0E0F',
  surface: '#1A1A1D',
  'surface-2': '#242428',
  primary: '#8A2BE2',
  'primary-hover': '#6A1BB2',
  'primary-light': 'rgba(138, 43, 226, 0.15)',
  accent: '#A1FAFF',
  'accent-dim': 'rgba(161, 250, 255, 0.6)',
  success: '#00E676',
  warning: '#FFD740',
  error: '#FF5252',
  info: '#448AFF',
  gold: '#FFD700',
  glass: {
    panel: 'rgba(255, 255, 255, 0.04)',
    card: 'rgba(255, 255, 255, 0.06)',
    elevated: 'rgba(255, 255, 255, 0.10)',
    floating: 'rgba(255, 255, 255, 0.12)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    DEFAULT: 'rgba(255, 255, 255, 0.15)',
    strong: 'rgba(255, 255, 255, 0.25)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.65)',
    tertiary: 'rgba(255, 255, 255, 0.4)',
  },
},
```

2. **Add Nocturne gradients to `backgroundImage`:**

```typescript
'gradient-nocturne': 'linear-gradient(135deg, #8A2BE2, #6A1BB2)',
'gradient-nocturne-accent': 'linear-gradient(135deg, #8A2BE2, #A1FAFF)',
'gradient-nocturne-hero': 'radial-gradient(ellipse at 30% 20%, rgba(138,43,226,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(161,250,255,0.1) 0%, transparent 50%), #0E0E0F',
'gradient-nocturne-card': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
```

3. **Add Nocturne shadows to `boxShadow`:**

```typescript
'nocturne-card': '0 8px 32px rgba(0, 0, 0, 0.4)',
'nocturne-card-hover': '0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 30px -5px rgba(138, 43, 226, 0.3)',
'nocturne-glow-purple': '0 0 30px -5px rgba(138, 43, 226, 0.5)',
'nocturne-glow-cyan': '0 0 20px -5px rgba(161, 250, 255, 0.4)',
'nocturne-glow-sm': '0 0 15px -3px rgba(138, 43, 226, 0.3)',
```

4. **Update borderRadius — add the 32px card radius:**

```typescript
'4xl': '32px',
```

5. **Add `backdrop-blur-3xl` to backdropBlur (Tailwind doesn't have it by default):**

```typescript
'3xl': '64px',
'4xl': '80px',
```

6. **Add Manrope to fontFamily:**

```typescript
display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
```

7. **Add Nocturne-specific animations:**

```typescript
// In animation:
'glow-pulse': 'glowPulse 3s ease-in-out infinite',
'tilt-in': 'tiltIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
'voice-bar': 'voiceBar 0.8s ease-in-out infinite alternate',

// In keyframes:
glowPulse: {
  '0%, 100%': { boxShadow: '0 0 20px -5px rgba(138, 43, 226, 0.3)' },
  '50%': { boxShadow: '0 0 40px -5px rgba(138, 43, 226, 0.6)' },
},
tiltIn: {
  from: { opacity: '0', transform: 'perspective(1000px) rotateX(10deg) translateY(20px)' },
  to: { opacity: '1', transform: 'perspective(1000px) rotateX(0) translateY(0)' },
},
voiceBar: {
  '0%': { transform: 'scaleY(0.3)' },
  '100%': { transform: 'scaleY(1)' },
},
```

### 0.2 Update globals.css

File: `apps/web/src/styles/globals.css`

Add a Nocturne section AFTER the existing base layer. Do not remove existing styles (they're used by public pages).

```css
/* ============================================
   NOCTURNE HOLLYWOOD THEME
   ============================================ */
@layer base {
  .theme-nocturne {
    --background: #0E0E0F;
    --foreground: #FFFFFF;
    --card: rgba(255, 255, 255, 0.06);
    --card-foreground: #FFFFFF;
    --muted: #1A1A1D;
    --muted-foreground: rgba(255, 255, 255, 0.65);
    --accent: rgba(138, 43, 226, 0.15);
    --accent-foreground: #A1FAFF;
    --border: rgba(255, 255, 255, 0.15);
    --input: rgba(255, 255, 255, 0.06);
    --ring: #8A2BE2;
    --radius: 32px;

    color-scheme: dark;
  }

  .theme-nocturne body {
    background-color: #0E0E0F;
    color: #FFFFFF;
  }

  .theme-nocturne ::selection {
    background-color: rgba(138, 43, 226, 0.3);
    color: #FFFFFF;
  }

  .theme-nocturne ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
  }
  .theme-nocturne ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .theme-nocturne *:focus-visible {
    outline: 2px solid rgba(138, 43, 226, 0.6);
    outline-offset: 2px;
  }
}

@layer components {
  /* ── Nocturne Glass Card ─────────────────── */
  .glass-card {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(64px);
    -webkit-backdrop-filter: blur(64px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 32px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .glass-card-hover {
    transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .glass-card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5),
                0 0 30px -5px rgba(138, 43, 226, 0.3);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* ── Nocturne Buttons ────────────────────── */
  .btn-nocturne-primary {
    @apply inline-flex items-center justify-center gap-2 px-6 py-3
           text-sm font-semibold text-white
           rounded-[16px]
           transition-all duration-200 ease-out
           active:scale-[0.97];
    background: linear-gradient(135deg, #8A2BE2, #6A1BB2);
    box-shadow: 0 0 20px -5px rgba(138, 43, 226, 0.4);
  }
  .btn-nocturne-primary:hover {
    box-shadow: 0 0 30px -5px rgba(138, 43, 226, 0.6);
    filter: brightness(1.1);
  }

  .btn-nocturne-secondary {
    @apply inline-flex items-center justify-center gap-2 px-6 py-3
           text-sm font-medium text-white
           rounded-[16px]
           transition-all duration-200 ease-out
           active:scale-[0.97];
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  .btn-nocturne-secondary:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .btn-nocturne-accent {
    @apply inline-flex items-center justify-center gap-2 px-6 py-3
           text-sm font-semibold rounded-[16px]
           transition-all duration-200 ease-out
           active:scale-[0.97];
    background: linear-gradient(135deg, #A1FAFF, #8A2BE2);
    color: #0E0E0F;
  }

  /* ── Nocturne Input ──────────────────────── */
  .input-nocturne {
    @apply w-full px-4 py-3 text-sm text-white rounded-[16px]
           transition-all duration-150;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  .input-nocturne::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .input-nocturne:focus {
    outline: none;
    border-color: #8A2BE2;
    box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.2);
  }

  /* ── Nocturne Badge ──────────────────────── */
  .badge-nocturne {
    @apply inline-flex items-center gap-1 px-3 py-1 rounded-pill
           text-caption font-medium;
    background: rgba(138, 43, 226, 0.15);
    color: #A1FAFF;
  }

  /* ── Nocturne Gradient Text ──────────────── */
  .text-gradient-nocturne {
    background: linear-gradient(135deg, #8A2BE2, #A1FAFF);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── Voice Waveform Bars ─────────────────── */
  .voice-bar {
    width: 3px;
    border-radius: 999px;
    background: #A1FAFF;
    animation: voiceBar 0.8s ease-in-out infinite alternate;
  }

  @keyframes voiceBar {
    0% { transform: scaleY(0.3); }
    100% { transform: scaleY(1); }
  }
}
```

### 0.3 Update layout.tsx

File: `apps/web/src/app/layout.tsx`

Add the Manrope font import alongside the existing Inter and Plus Jakarta Sans:

```typescript
import { Inter, Plus_Jakarta_Sans, Manrope } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});
```

Add `manrope.variable` to the `<html>` className.

### 0.4 Dashboard Layouts Get theme-nocturne

The `theme-nocturne` class must be applied to all dashboard route layouts:
- `apps/web/src/app/(dashboard)/layout.tsx` — add `className="theme-nocturne"` to the wrapping `<div>` or `<html>`.

Public pages (homepage, search, artist profile) can stay light or be converted — your call, but dashboards are Nocturne-only.

---

## Phase 1: Screen-by-Screen Implementation

### Screen Map: Stitch → Existing Components

| # | Stitch Screen | Screen ID | Primary Component(s) to Create/Modify |
|---|--------------|-----------|--------------------------------------|
| 1 | Event Dashboard - Hollywood Cinematic | SCREEN_14 | `(dashboard)/client/page.tsx`, `components/layout/DashboardLayout.tsx` |
| 2 | AI Artist Discovery - Cinematic Noir | SCREEN_83 | `(public)/search/page.tsx`, `components/search/SearchBar.tsx`, `components/search/ArtistCard.tsx`, `components/search/FilterSidebar.tsx` |
| 3 | Artist Portfolio Showcase | SCREEN_52 | `(public)/artists/[id]/ArtistPageClient.tsx`, `components/artist/*` |
| 4 | AI Presentation Builder | SCREEN_80 | `(dashboard)/client/workspace/[id]/presentations/page.tsx` |
| 5 | Global Voice Command Overlay | SCREEN_37 | `components/voice/VoiceAssistant.tsx`, `components/voice/VoiceWaveform.tsx` |
| 6 | AI Marketing Tools Dashboard | SCREEN_65 | NEW: `(dashboard)/artist/marketing/page.tsx` |
| 7 | Client Review & Feedback | SCREEN_75 | `components/booking/ReviewForm.tsx`, `components/artist/ArtistReviews.tsx` |
| 8 | Event Dashboard 3D Refined | SCREEN_89 | `(dashboard)/event-company/page.tsx` |
| 9 | Onboarding: Welcome - Hollywood Glamour | SCREEN_79 | `(dashboard)/artist/onboarding/page.tsx`, `(dashboard)/client/onboarding/page.tsx` |
| 10 | Onboarding: Media & Niche | SCREEN_36 | `(dashboard)/artist/onboarding/page.tsx` (step 2) |

---

### SCREEN 01: Event Dashboard (SCREEN_14)

**Target files:**
- `apps/web/src/app/(dashboard)/client/page.tsx`
- `apps/web/src/components/layout/DashboardLayout.tsx`

**What to build:**
- Full-width dark background (`bg-nocturne-base`)
- Left sidebar with glass-panel styling, nav items with active state (purple left border + cyan text)
- Main content area with grid of glass-cards:
  - "Upcoming Events" card with event list items (date, venue, artist, status badge)
  - "Quick Stats" row: total events, confirmed, pending, budget utilization — each in a small glass card with an icon and count-up number
  - "Recent Activity" timeline with glass-card items
- Top bar with search input (input-nocturne), notification bell, user avatar
- Backstage AI mini voice widget in bottom-right corner (persistent)

**3D/Motion requirements:**
- Cards use `tiltIn` animation on mount (staggered)
- Stat cards have `perspective(1000px)` parent, slight rotateX on hover
- Event list items fade-in-up on scroll

---

### SCREEN 02: AI Artist Discovery (SCREEN_83)

**Target files:**
- `apps/web/src/app/(public)/search/page.tsx`
- `apps/web/src/components/search/SearchBar.tsx`
- `apps/web/src/components/search/ArtistCard.tsx`
- `apps/web/src/components/search/FilterSidebar.tsx`
- `apps/web/src/components/search/FilterDrawer.tsx`

**What to build:**
- Dark page background with subtle radial gradient (nocturne-hero)
- Hero search area at top:
  - Large voice-activatable search bar with microphone icon + waveform animation when active
  - Text: "Find Your Perfect Artist" in gradient text (nocturne-accent gradient)
  - AI suggestion chips below search bar (glass badges)
- Filter sidebar (glass-panel):
  - Category, genre, city, price range, availability, rating filters
  - Each filter group in a collapsible section
  - Active filters shown as cyan-highlighted badges
- Artist result grid (3 columns desktop, 2 tablet, 1 mobile):
  - Each artist is a glass-card with:
    - Cover image (top, rounded corners)
    - Stage name, genres as badges, city
    - Trust score with gold stars
    - Price range
    - "View Profile" button (btn-nocturne-secondary)
    - Hover: card lifts with purple glow shadow

**Voice integration:**
- Search bar doubles as voice input — clicking mic triggers VoiceAssistant overlay
- AI can suggest filters via natural language ("Show me Bollywood singers in Mumbai under 3 lakhs")

---

### SCREEN 03: Artist Portfolio Showcase (SCREEN_52)

**Target files:**
- `apps/web/src/app/(public)/artists/[id]/ArtistPageClient.tsx`
- `apps/web/src/components/artist/ArtistCoverSection.tsx`
- `apps/web/src/components/artist/ArtistGallery.tsx`
- `apps/web/src/components/artist/ArtistPricingCards.tsx`
- `apps/web/src/components/artist/ArtistReviews.tsx`
- `apps/web/src/components/artist/AvailabilityCalendar.tsx`

**What to build:**
- Full-bleed hero with artist cover image, dark gradient overlay from bottom
- Artist name in `hero` size, genres as nocturne badges, trust score with gold stars
- Glass-card sections for: Bio, Gallery, Pricing, Reviews, Availability Calendar, Booking CTA
- Gallery: horizontal scroll of media cards with glass borders
- Pricing: glass cards with event type, price, duration — purple glow on "Book Now"
- Reviews: glass cards with star rating, comment, reviewer name
- Floating "Book This Artist" CTA button (sticky bottom on mobile)

---

### SCREEN 04: AI Presentation Builder (SCREEN_80)

**Target files:**
- `apps/web/src/app/(dashboard)/client/workspace/[id]/presentations/page.tsx`

**What to build:**
- Split view: left panel = artist selection list, right panel = live presentation preview
- Top toolbar: title input, template selector, toggle pricing/media
- Artist cards in left panel: drag-to-reorder, glass-card style
- Preview panel: A4-shaped card showing presentation layout with real data
- "Generate PDF" button with loading animation (purple glow pulse)
- AI assist: voice button to say "Add DJ Arjun to the presentation" or "Remove pricing"

---

### SCREEN 05: Global Voice Command Overlay (SCREEN_37)

**Target files:**
- `apps/web/src/components/voice/VoiceAssistant.tsx`
- `apps/web/src/components/voice/VoiceWaveform.tsx`
- `apps/web/src/components/voice/MiniArtistCard.tsx`

**What to build:**
This is the central "Backstage AI" interaction. A full-screen overlay that appears when voice is activated.

- Full-screen glass overlay with heavy blur (`backdrop-blur-4xl`)
- Center: large voice waveform visualization (5 bars, cyan color, `voiceBar` animation)
- Below waveform: AI response text, typing animation
- Below response: action cards (if AI returns results — mini artist cards, booking summaries, etc.)
- Transcript history scrolls above
- "Tap to speak" / "Listening..." / "Processing..." state indicators
- Close button (X) top-right

**The mini voice widget** (persistent bottom-right corner on all dashboard pages):
- Small glass circle (48px) with waveform icon
- Pulses gently when idle (`glow-pulse`)
- Expands to full overlay on click

---

### SCREEN 06: AI Marketing Tools Dashboard (SCREEN_65)

**Target files:**
- NEW: `apps/web/src/app/(dashboard)/artist/marketing/page.tsx`

**What to build:**
- Dashboard for artists to manage their marketing/promotion
- Glass-card grid:
  - "Social Media Reach" — chart card with line graph (cyan accent)
  - "Profile Views" — stat card with count-up
  - "Booking Conversion" — percentage with radial progress (purple gradient)
  - "AI Recommendations" — list of actionable suggestions in glass cards
  - "Content Calendar" — upcoming social posts / events
- Each card uses glass-card + tiltIn entrance animation

---

### SCREEN 07: Client Review & Feedback (SCREEN_75)

**Target files:**
- `apps/web/src/components/booking/ReviewForm.tsx`
- `apps/web/src/components/artist/ArtistReviews.tsx`

**What to build:**
- Glass-card review form:
  - Star rating (interactive, gold stars, 1-5)
  - Dimension ratings (professionalism, punctuality, etc.) — slider or star sub-ratings
  - Comment textarea (input-nocturne)
  - Submit button (btn-nocturne-primary)
- Review display cards:
  - Glass-card per review
  - Reviewer avatar + name + date
  - Star rating + dimension breakdown
  - Comment text

---

### SCREEN 08: Event Dashboard 3D Refined (SCREEN_89)

**Target files:**
- `apps/web/src/app/(dashboard)/event-company/page.tsx`

**What to build:**
- Similar structure to Screen 01 but for event companies (workspace view)
- 3D card grid showing workspace events
- Each event card: glass-card with event name, date, city, status, artist shortlist count
- Budget utilization bars (purple gradient fill)
- "Create Event" floating action button (btn-nocturne-accent, positioned bottom-right)
- Quick-action row: "Find Artists", "Generate Presentation", "View Analytics"

---

### SCREEN 09: Onboarding Welcome (SCREEN_79)

**Target files:**
- `apps/web/src/app/(dashboard)/artist/onboarding/page.tsx`
- `apps/web/src/app/(dashboard)/client/onboarding/page.tsx`

**What to build:**
- Full-screen nocturne background with hero gradient
- Center-aligned:
  - Welcome text: "Welcome to the Stage" in hero size, gradient text
  - Subtext explaining the platform
  - Role selection cards (glass-card-hover): Artist, Client, Event Company, Agent
  - Each role card has an icon, title, description, arrow CTA
- Bottom: "Get Started" button (btn-nocturne-primary, full-width on mobile)
- Subtle animated mesh gradient in background (CSS only, no canvas)

---

### SCREEN 10: Onboarding Media & Niche (SCREEN_36)

**Target files:**
- `apps/web/src/app/(dashboard)/artist/onboarding/page.tsx` (step 2)

**What to build:**
- Step indicator at top (horizontal dots/lines, active = cyan, completed = purple)
- Glass-card form:
  - "Select Your Genres" — grid of selectable genre chips (toggle on/off, active = purple bg)
  - "Upload Media" — drag-and-drop zone with dashed border (nocturne border color)
  - "Base City" — input-nocturne with autocomplete
  - "Bio" — textarea input-nocturne
- Preview card on right (desktop) showing how the profile will look
- Navigation: "Back" (btn-nocturne-secondary) + "Continue" (btn-nocturne-primary)

---

## Phase 2: Component Library Updates

### Existing Components That Need Nocturne Variants

| Component | File | What Changes |
|-----------|------|-------------|
| `DashboardLayout` | `components/layout/DashboardLayout.tsx` | Sidebar → glass-panel, dark bg, Nocturne nav items, Backstage AI widget |
| `Navbar` | `components/layout/Navbar.tsx` | Dark variant with glass background for dashboard pages |
| `Footer` | `components/layout/Footer.tsx` | Dark variant for dashboard context |
| `SearchBar` | `components/search/SearchBar.tsx` | Nocturne input styling + voice mic integration |
| `ArtistCard` | `components/search/ArtistCard.tsx` | Glass-card, dark text on dark bg, purple glow hover |
| `FilterSidebar` | `components/search/FilterSidebar.tsx` | Glass-panel background, nocturne toggles/checkboxes |
| `VoiceAssistant` | `components/voice/VoiceAssistant.tsx` | Full Backstage AI overlay (Screen 05) |
| `VoiceWaveform` | `components/voice/VoiceWaveform.tsx` | Cyan bars, voiceBar animation |
| `Hero` | `components/landing/Hero.tsx` | Optional Nocturne variant (or keep light for marketing) |
| `ReviewForm` | `components/booking/ReviewForm.tsx` | Glass-card form, gold stars, nocturne inputs |
| `TiltCard` | `components/motion/TiltCard.tsx` | Already has 3D tilt — ensure works with glass-card styling |
| `GradientMeshBg` | `components/shared/GradientMeshBg.tsx` | Add nocturne mesh variant (dark purples/cyans) |
| `FloatingBlob` | `components/shared/FloatingBlob.tsx` | Change colors to nocturne palette |

### New Components to Create

| Component | Path | Purpose |
|-----------|------|---------|
| `GlassCard` | `components/ui/GlassCard.tsx` | Reusable glass surface card with variants (panel, card, elevated, floating) |
| `NocturneButton` | `components/ui/NocturneButton.tsx` | Button with primary/secondary/accent/ghost variants |
| `NocturneInput` | `components/ui/NocturneInput.tsx` | Dark input with focus glow |
| `NocturneBadge` | `components/ui/NocturneBadge.tsx` | Glass badge with color variants |
| `BackstageAIMini` | `components/voice/BackstageAIMini.tsx` | Persistent mini voice widget (bottom-right corner) |
| `BackstageAIOverlay` | `components/voice/BackstageAIOverlay.tsx` | Full-screen voice command overlay |
| `NocturneStatCard` | `components/dashboard/NocturneStatCard.tsx` | Stat display card with icon + count-up + label |
| `NocturneNavItem` | `components/layout/NocturneNavItem.tsx` | Sidebar nav item with active state |

---

## Phase 3: Stitch Screen Code Extraction

The Stitch project contains the actual HTML/Tailwind code for each screen. Since we couldn't extract it programmatically, follow these steps:

1. Open `https://stitch.withgoogle.com/projects/268937186186631956` in a browser
2. For each screen, click it to open the editor
3. Look for "Code" or "Export" panel — Stitch generates HTML/Tailwind
4. Copy the generated code for each screen
5. Use it as the structural template, then adapt to React/Next.js components
6. Replace Stitch's inline styles with the Tailwind classes defined in this handoff

If Stitch export is not available, build each screen from the descriptions in Phase 1 above using the design tokens from `NOCTURNE_DESIGN_SYSTEM.md`.

---

## Implementation Order

1. **Foundation** (Phase 0) — Tailwind config, globals.css, layout.tsx, font loading
2. **Glass component library** — GlassCard, NocturneButton, NocturneInput, NocturneBadge
3. **DashboardLayout** — Sidebar + top bar + Backstage AI mini widget
4. **Voice overlay** (Screen 05) — Central interaction pattern, used everywhere
5. **Event Dashboard** (Screen 01) — First full dashboard page
6. **Search/Discovery** (Screen 02) — Highest user-facing impact
7. **Artist Portfolio** (Screen 03) — Public-facing showcase
8. **Onboarding** (Screens 09-10) — First-time user experience
9. **Remaining dashboards** (Screens 04, 06, 07, 08) — Internal tools

---

## Critical Rules

- **DO NOT delete the existing light theme.** Add Nocturne alongside it. Dashboard routes use `theme-nocturne` class; public pages can stay light.
- **All glass surfaces need `-webkit-backdrop-filter`** for Safari support.
- **32px border-radius is the standard** for cards. 16px for buttons and inputs. 999px for pills/badges.
- **`backdrop-blur(64px)`** is the standard card blur. Use sparingly on mobile (performance).
- **Manrope** is the primary font. Fallback to system-ui.
- **Respect `prefers-reduced-motion`** — all 3D transforms and animations must have reduced-motion alternatives.
- **The Backstage AI voice widget must be present on ALL dashboard pages** — it's the central interaction pattern.
- **Keep existing API integration unchanged** — this is purely a frontend visual redesign. No API changes needed.
