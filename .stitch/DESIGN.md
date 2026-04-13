# GRID Design System

## Brand Identity
- **Name:** GRID
- **Tagline:** Run your event business. All on one platform.
- **Logo:** "GRID" in Inter Black, tracking-[0.3em], uppercase, pure white
- **Category:** Agency Operating System for Live Entertainment

## Color Palette

### Core Colors
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background | Void | `#0e0e0f` | Page background, dark surfaces |
| Surface | Obsidian | `#1a191b` | Cards, modals, elevated surfaces |
| Surface Subtle | Smoke | `rgba(255,255,255,0.02)` | Hover states, subtle cards |
| Border | Ghost | `rgba(255,255,255,0.08)` | Default borders |
| Border Hover | Mist | `rgba(255,255,255,0.15)` | Hover borders |

### Accent Colors
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Primary (Artists) | Violet | `#c39bff` | Artist actions, CTA highlights, active states |
| Secondary (Companies) | Cyan | `#a1faff` | Company actions, success indicators |
| Warning | Amber | `#facc15` | Negotiating status, alerts |
| Success | Emerald | `#22c55e` | Confirmed, completed states |
| Danger | Red | `#ef4444` | Errors, cancelled, destructive actions |

### Text Colors
| Role | Opacity | Usage |
|------|---------|-------|
| Primary | `text-white` | Headlines, primary content |
| Secondary | `text-white/60` | Body text, descriptions |
| Tertiary | `text-white/40` | Labels, metadata |
| Muted | `text-white/20` | Timestamps, disabled text |

## Typography

| Element | Font | Weight | Size | Tracking |
|---------|------|--------|------|----------|
| Logo | Inter | 900 (Black) | text-xl | 0.3em |
| H1 | Manrope | 800 | text-3xl md:text-4xl lg:text-5xl | -0.02em |
| H2 | Manrope | 700 | text-xl md:text-2xl | -0.01em |
| H3 | Inter | 600 | text-sm | 0 |
| Body | Inter | 400 | text-sm | 0 |
| Caption | Inter | 500 | text-xs | 0 |
| Badge | Inter | 700 | text-[10px] | 0.2em (uppercase) |

## Component Patterns

### Chat Box (Hero)
- Background: `rgba(255,255,255,0.97)` (white)
- Border: `2px solid #c39bff/60` (purple, thickens on hover/focus)
- Rounded: `rounded-2xl`
- Shadow: `0 0 40px rgba(195,155,255,0.15), 0 12px 48px rgba(0,0,0,0.2)`
- Text: `text-[#1a1a1d]` on white background

### Glass Card
- Background: `rgba(26,25,27,0.8)` with `backdrop-blur-sm`
- Border: `border border-white/10`
- Rounded: `rounded-xl` or `rounded-2xl`

### Entry Card (For Artists / For Event Companies)
- Border: `border-2` with accent color at 40% opacity
- Hover: border increases to 70%, slight y-lift
- Icon: 40x40 rounded-xl with accent background at 15%
- Background: accent color at 8% with `backdrop-blur-12px`

### Status Badges
| Status | Background | Text Color |
|--------|-----------|------------|
| Inquiry/Brief | `#c39bff/15` | `#c39bff` |
| Negotiating | `#facc15/15` | `#facc15` |
| Confirmed | `#22c55e/15` | `#22c55e` |
| Completed | `#22c55e/15` | `#22c55e` |
| Cancelled | `#ef4444/15` | `#ef4444` |

### Buttons
| Type | Style |
|------|-------|
| Primary | `bg-white text-[#0e0e0f]` — white on dark |
| Secondary | `border border-white/15 text-white/60` — outline |
| Accent | `bg-[#c39bff] text-[#0e0e0f]` — purple filled |
| Ghost | `text-white/30 hover:text-white/60` — text only |

### Form Inputs
- Background: `bg-white/5`
- Border: `border border-white/10`
- Focus: `focus:border-[#c39bff]/50`
- Rounded: `rounded-xl`
- Padding: `px-4 py-3`
- Text: `text-white placeholder:text-white/20`

## Layout Patterns

### Page Container
- Max width: `max-w-5xl mx-auto` (content pages)
- Padding: `px-6 md:px-8`

### Kanban Board
- 4 columns: `grid grid-cols-1 md:grid-cols-4 gap-4`
- Column header: colored dot + label + count badge
- Cards: glass-card with status badge, artist name, amount

### Split Layout (Onboarding)
- Left: 5/12 — value prop panel (dark gradient)
- Right: 7/12 — form panel (centered content)

## Animation
- Entrance: `animate-fade-in` (opacity 0→1, y 20→0)
- Hover lift: `whileHover={{ scale: 1.03, y: -2 }}`
- Transitions: `transition-all duration-300`
- Loading: bouncing dots (`animate-bounce` with staggered delays)

## Responsive Breakpoints
- Mobile: default (< 768px)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)
- Wide: `xl:` (1280px+)
