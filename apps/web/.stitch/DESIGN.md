# Nocturne Hollywood Design System
## Creative North Star: "The Neon Auteur"

A digital stage blending Hollywood Noir atmosphere with Bento Box modularity. Dark-only. Glassmorphism-first. Voice-driven. Every surface is polished obsidian or frosted glass stacked in 3D space.

---

## 1. Identity

- **Name**: Nocturne Hollywood
- **Theme**: Dark-only (no light variant)
- **Aesthetic**: Cinematic Noir + Bento modularity + Stage Lighting
- **Interaction**: Voice-first via "Backstage AI"
- **Tailwind class**: `.theme-nocturne` on `<html>`

---

## 2. Color Tokens

### Core Palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Base | `#0E0E0F` | `nocturne-base` | Page background, root surface |
| Surface | `#1A1A1D` | `nocturne-surface` | Elevated card backgrounds |
| Surface 2 | `#242428` | `nocturne-surface-2` | Higher elevation surfaces |
| Primary | `#8A2BE2` | `nocturne-primary` | Actions, brand, glows |
| Primary Hover | `#6A1BB2` | `nocturne-primary-hover` | Hover state for primary |
| Primary Light | `rgba(138,43,226,0.15)` | `nocturne-primary-light` | Subtle primary backgrounds |
| Accent | `#A1FAFF` | `nocturne-accent` | AI highlights, voice waveform, data |
| Accent Dim | `rgba(161,250,255,0.6)` | `nocturne-accent-dim` | Muted accent |

### Stitch PRD Extended Palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Electric Violet | `#CA98FF` | `nocturne-violet` | Light violet accents |
| Deep Violet | `#8523DD` | `nocturne-violet-deep` | Dark violet CTA fills |
| Cyber Cyan | `#98F1F6` | `nocturne-cyan` | Technical data, secondary |
| Noir Rose | `#FF8B9A` | `nocturne-rose` | Delicate accents, error states |

### Surface Container Tiers

| Level | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Lowest | `#000000` | `nocturne-container-lowest` | Stage floor |
| Low | `#131313` | `nocturne-container-low` | Backdrop |
| Default | `#1A1919` | `nocturne-container` | Standard container |
| High | `#201F1F` | `nocturne-container-high` | Elevated container |
| Highest | `#262626` | `nocturne-container-highest` | Top-level container |

### Status Colors

| Token | Hex | Tailwind |
|-------|-----|----------|
| Success | `#00E676` | `nocturne-success` |
| Warning | `#FFD740` | `nocturne-warning` |
| Error | `#FF5252` | `nocturne-error` |
| Info | `#448AFF` | `nocturne-info` |
| Gold | `#FFD700` | `nocturne-gold` |

### Glow Colors

| Token | Value | Usage |
|-------|-------|-------|
| Purple Glow | `rgba(138,43,226,0.35)` | Shadows behind primary elements |
| Cyan Glow | `rgba(161,250,255,0.25)` | Shadows behind AI/data elements |

### Glass Surfaces (rgba white layers)

| Level | Background | Blur | Border | Tailwind |
|-------|-----------|------|--------|----------|
| Panel | `rgba(255,255,255,0.04)` | `32px` | `rgba(255,255,255,0.08)` | `.glass-panel` |
| Card | `rgba(255,255,255,0.06)` | `64px` | `rgba(255,255,255,0.15)` | `.glass-card` |
| Elevated | `rgba(255,255,255,0.10)` | `64px` | `rgba(255,255,255,0.20)` | hover state |
| Floating | `rgba(255,255,255,0.12)` | `80px` | `rgba(255,255,255,0.25)` | `.glass-floating` |

### Text Opacity

| Level | Value | Tailwind |
|-------|-------|----------|
| Primary | `#FFFFFF` | `nocturne-text-primary` |
| Secondary | `rgba(255,255,255,0.65)` | `nocturne-text-secondary` |
| Tertiary | `rgba(255,255,255,0.4)` | `nocturne-text-tertiary` |

### Gradients

```
Primary:      linear-gradient(135deg, #8A2BE2, #6A1BB2)
Accent:       linear-gradient(135deg, #8A2BE2, #A1FAFF)
Hero:         radial-gradient(ellipse at 30% 20%, rgba(138,43,226,0.25), transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(161,250,255,0.1), transparent 50%), #0E0E0F
Card:         linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))
Mesh:         conic-gradient(from 180deg, #8A2BE2, #0E0E0F 120deg, #A1FAFF 240deg, #8A2BE2)
```

---

## 3. Typography

### Font Stack

| Role | Font | Tailwind |
|------|------|----------|
| Primary UI | Manrope | `font-display` |
| Body | Inter | `font-sans` |
| Data/Code | JetBrains Mono | `font-mono` |

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| `hero` | 4.5rem | 800 | 1.0 | -0.04em |
| `display` | 3.5rem | 700 | 1.05 | -0.03em |
| `h1` | 2.75rem | 700 | 1.1 | -0.02em |
| `h2` | 2rem | 700 | 1.2 | -0.015em |
| `h3` | 1.5rem | 600 | 1.3 | -0.01em |
| `h4` | 1.25rem | 600 | 1.4 | -0.01em |
| `body-lg` | 1.125rem | 400 | 1.7 | 0 |
| `body` | 1rem | 400 | 1.6 | 0 |
| `body-sm` | 0.875rem | 400 | 1.5 | 0 |
| `caption` | 0.75rem | 500 | 1.5 | 0.02em |
| `overline` | 0.6875rem | 600 | 1.0 | 0.1em |

### Typography Rules

- Headlines: Manrope with tight negative letter-spacing
- Labels: UPPERCASE with `0.1em` tracking (overline token)
- Body: Inter for readability
- Data tables: JetBrains Mono for alignment

---

## 4. Spacing & Layout

### Spacing Scale (4px base grid)

`0.5(2px) 1(4px) 1.5(6px) 2(8px) 2.5(10px) 3(12px) 4(16px) 5(20px) 6(24px) 8(32px) 10(40px) 12(48px) 16(64px) 20(80px) 24(96px) 32(128px)`

### Layout Constants

| Token | Mobile | Desktop |
|-------|--------|---------|
| Page padding | 24px | 48px |
| Section gap | 80px | 120px |
| Card padding | 24px | 32px |
| Sidebar width | slide-over | 280px |

### Border Radius

| Element | Value | Tailwind |
|---------|-------|----------|
| Cards/Panels | 32px | `rounded-4xl` |
| Buttons | 16px | `rounded-xl` |
| Inputs | 16px | `rounded-xl` |
| Pills/Tags | 999px | `rounded-pill` |
| Large containers | 48px | `xl` per Stitch spec |

---

## 5. Component Specs

### Buttons

```
Primary:     bg-gradient(135deg, #8A2BE2, #6A1BB2), text-white, rounded-16px, glow-shadow
             CSS: .btn-nocturne-primary
Secondary:   bg-transparent, border rgba(255,255,255,0.15), text-white, rounded-16px
             CSS: .btn-nocturne-secondary
Accent:      bg-gradient(135deg, #A1FAFF, #8A2BE2), text-#0E0E0F, rounded-16px
             CSS: .btn-nocturne-accent
Ghost:       bg-transparent, text rgba(255,255,255,0.65), hover:text-white
```

### Cards (Glass Kit)

```
Standard:    .glass-card — blur(64px), rgba(255,255,255,0.06), border rgba(255,255,255,0.15), radius 32px
Hoverable:   .glass-card .glass-card-hover — translateY(-4px), enhanced glow on hover
Panel:       .glass-panel — blur(32px), rgba(255,255,255,0.04), border rgba(255,255,255,0.08)
Floating:    .glass-floating — blur(80px), rgba(255,255,255,0.12), border rgba(255,255,255,0.25)
```

**Card rules**: No divider lines inside cards. Use spacing-8/spacing-10 whitespace. Subtle top-down gradient simulates light on glass edge.

### Inputs

```
CSS: .input-nocturne
bg: rgba(255,255,255,0.06), border rgba(255,255,255,0.15), radius 16px
placeholder: rgba(255,255,255,0.4)
focus: border #8A2BE2, ring rgba(138,43,226,0.2)
```

### Badges / Tags

```
CSS: .badge-nocturne
bg: rgba(138,43,226,0.15), text #A1FAFF, radius pill, padding 4px 12px
```

### Chips

```
CSS: .nocturne-chip
Pill-shaped, semi-transparent bg, high-contrast text
```

### Navigation (Sidebar)

```
width: 280px (desktop), slide-over (mobile)
bg: glass-panel
active item: bg rgba(138,43,226,0.15), text #A1FAFF, left-border 3px #8A2BE2
```

### Dividers

```
CSS: .nocturne-divider
NOT a border line — uses background color shift per No-Line Rule
bg: rgba(255,255,255,0.06), height 1px
```

---

## 6. Shadows & Glows

### Box Shadows

| Token | Value | Tailwind |
|-------|-------|----------|
| Card | `0 8px 32px rgba(0,0,0,0.4)` | `shadow-nocturne-card` |
| Card Hover | `0 20px 50px -10px rgba(0,0,0,0.5), 0 0 30px -5px rgba(138,43,226,0.3)` | `shadow-nocturne-card-hover` |
| Purple Glow | `0 0 30px -5px rgba(138,43,226,0.5)` | `shadow-nocturne-glow-purple` |
| Cyan Glow | `0 0 20px -5px rgba(161,250,255,0.4)` | `shadow-nocturne-glow-cyan` |
| Small Glow | `0 0 15px -3px rgba(138,43,226,0.3)` | `shadow-nocturne-glow-sm` |

### Stage Lighting

Ambient radial gradients placed behind key components:
```
Violet Glow:  radial-gradient(circle, rgba(138,43,226,0.15), transparent 70%)
Cyan Glow:    radial-gradient(circle, rgba(161,250,255,0.1), transparent 70%)
```

---

## 7. Animation & Motion

### Transitions

| Speed | Duration | Easing |
|-------|----------|--------|
| Fast | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Normal | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Slow | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

### Keyframe Animations

| Name | Tailwind | Description |
|------|----------|-------------|
| `glowPulse` | `animate-glow-pulse` | Purple glow oscillation (3s loop) |
| `tiltIn` | `animate-tilt-in` | 3D perspective entry (0.6s) |
| `voiceBar` | `animate-voice-bar` | Voice waveform scaleY (0.8s alternate) |
| `fadeInUp` | `animate-fade-in-up` | Opacity + translateY entry |

### 3D Transform Rules

- Parent: `perspective(1000px)`
- Hover tilt: `rotateX(+/-5deg) rotateY(+/-5deg)` with `transform-style: preserve-3d`
- GPU acceleration: `will-change: transform`
- Respect `prefers-reduced-motion: reduce`

### Voice Waveform (Backstage AI)

- 5 bars, 3px wide, varying heights
- Color: `#A1FAFF` (accent)
- Animation: `scaleY` oscillation, staggered 0.1s delays
- Idle: 0.3 amplitude / Active: 1.0 amplitude

---

## 8. Design Rules

### The No-Line Rule
**Explicit**: No 1px solid borders for sectioning. Boundaries defined by:
1. Background color shifts (surface tier changes)
2. Tonal transitions between container levels
3. Backdrop blur bleeding through glass layers

### The Glass & Gradient Rule
- Primary CTAs: subtle gradients (primary to primary-container)
- Floating elements: surface colors at 40-60% opacity with 24-40px backdrop-blur
- Cards: top-down gradient simulating light on glass edge

### The Ghost Border Fallback
If an edge MUST be defined for accessibility: `outline-variant` at **15% opacity** — a refraction hint, not a line.

### Do's
- Massive corner radii (24-32px) for Bento squircle aesthetic
- Asymmetrical layouts — bleed images/titles off-grid for cinematic framing
- `backdrop-blur` on ALL overlays (modals, tooltips, nav bars)
- Editorial white space — if crowded, increase spacing from 6 to 12

### Don'ts
- No 100% opaque high-contrast borders (kills glass illusion)
- No small dark drop shadows (use large, soft, tinted ambient occlusion)
- No cluttered screens — luxury requires room to breathe
- No flat surfaces — every element has depth via glass layers

---

## 9. Screen Inventory (60+ screens)

### Event Company Journey
- Dashboard (Hollywood Cinematic Command Center)
- AI Artist Discovery & Search Results
- AI Presentation Builder (Voice Deck Assembly)
- AI PDF Generation & Voice Customizer
- WhatsApp Message Voice Refinement
- Analytics Dashboard
- AI Marketing Tools
- Client Review & Feedback (Escrow Release)

### Artist Journey
- Management Dashboard (Hollywood Glamour)
- Escrow Wallet Deep Dive
- Microsite (Public Profile)
- Portfolio Showcase (Cinematic Audition)
- AI Analytics Deep Dive
- AI Video Editor (Voice Showreel Studio)
- Booking Inquiry Management
- AI Insights Dashboard

### Financial & Trust
- Fund Escrow & Confirm Booking (Checkout)
- Booking Confirmed (Success)
- Escrow Dispute & AI Mediation
- Resolution Center (Refined Mediation)
- Final Settlement Proposal
- Human Arbitrator Hub
- Final Ruling & Escrow Execution

### Onboarding & Global
- Premium Landing Page
- Onboarding: Welcome / Media & Niche / Escrow & Security
- Global Voice Command Overlay
- WhatsApp Artist Proposal (Mobile)

---

## 10. Implementation Reference

### Tailwind Config
`apps/web/tailwind.config.ts` — all tokens under `nocturne.*` namespace

### CSS Utilities
`apps/web/src/styles/globals.css` — component classes under `@layer components`

### Theme Activation
```html
<html class="theme-nocturne">
```

### CSS Variables (set by .theme-nocturne)
```css
--background: #0E0E0F
--foreground: #FFFFFF
--card: rgba(255,255,255,0.06)
--border: rgba(255,255,255,0.15)
--ring: #8A2BE2
--radius: 32px
```
