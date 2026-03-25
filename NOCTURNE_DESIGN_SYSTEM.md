# Nocturne Hollywood Design System

This is the canonical design system reference for the "Nocturne Elite" redesign of the Artist Booking Platform. Every component, token, and screen must follow this spec.

---

## 1. Design Philosophy

The Nocturne Hollywood aesthetic is: **Modern Noir, High-Gloss Glassmorphism, Cinematic Depth, 3D Interactive, Voice-First.**

The central interaction pattern is "Backstage AI" — a persistent voice-driven interface that handles discovery, document generation, and financial management through natural language.

---

## 2. Color Palette

### Primary Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--nocturne-base` | `#0E0E0F` | Deep Obsidian — page backgrounds, base surfaces |
| `--nocturne-primary` | `#8A2BE2` | Neon Purple — primary actions, brand identity, glows |
| `--nocturne-accent` | `#A1FAFF` | Electric Cyan — AI data highlights, voice waveform, active states |
| `--nocturne-surface` | `#1A1A1D` | Elevated surface cards |
| `--nocturne-surface-glass` | `rgba(255, 255, 255, 0.06)` | Glassmorphic card fill |
| `--nocturne-border-glow` | `rgba(255, 255, 255, 0.15)` | Inner border glows on glass surfaces |
| `--nocturne-text-primary` | `#FFFFFF` | Primary text on dark backgrounds |
| `--nocturne-text-secondary` | `rgba(255, 255, 255, 0.65)` | Secondary/muted text |
| `--nocturne-text-tertiary` | `rgba(255, 255, 255, 0.4)` | Tertiary/disabled text |

### Extended Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--nocturne-success` | `#00E676` | Confirmed, positive states |
| `--nocturne-warning` | `#FFD740` | Pending, attention states |
| `--nocturne-error` | `#FF5252` | Error, cancelled, destructive |
| `--nocturne-info` | `#448AFF` | Informational highlights |
| `--nocturne-gold` | `#FFD700` | Premium, ratings, trust score |
| `--nocturne-purple-glow` | `rgba(138, 43, 226, 0.35)` | Glow shadows behind primary elements |
| `--nocturne-cyan-glow` | `rgba(161, 250, 255, 0.25)` | Glow shadows behind AI/data elements |

### Gradient Definitions

```css
--gradient-nocturne-primary: linear-gradient(135deg, #8A2BE2, #6A1BB2);
--gradient-nocturne-accent: linear-gradient(135deg, #8A2BE2, #A1FAFF);
--gradient-nocturne-hero: radial-gradient(ellipse at 30% 20%, rgba(138,43,226,0.25) 0%, transparent 60%),
                          radial-gradient(ellipse at 70% 80%, rgba(161,250,255,0.1) 0%, transparent 50%),
                          #0E0E0F;
--gradient-nocturne-card: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
--gradient-nocturne-mesh: conic-gradient(from 180deg at 50% 50%, #8A2BE2 0deg, #0E0E0F 120deg, #A1FAFF 240deg, #8A2BE2 360deg);
```

---

## 3. Typography

### Font Stack

| Role | Font | Fallback |
|------|------|----------|
| **Primary UI/UX** | `Manrope` | `system-ui, -apple-system, sans-serif` |
| **Monospace/Data** | `JetBrains Mono` | `Menlo, Monaco, monospace` |

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `hero` | 4.5rem (72px) | 800 | 1.0 | -0.04em | Hero headlines |
| `display` | 3.5rem (56px) | 700 | 1.05 | -0.03em | Section headers |
| `h1` | 2.75rem (44px) | 700 | 1.1 | -0.02em | Page titles |
| `h2` | 2rem (32px) | 700 | 1.2 | -0.015em | Card/section titles |
| `h3` | 1.5rem (24px) | 600 | 1.3 | -0.01em | Subsection titles |
| `h4` | 1.25rem (20px) | 600 | 1.4 | -0.01em | Card headers |
| `body-lg` | 1.125rem (18px) | 400 | 1.7 | 0 | Lead paragraphs |
| `body` | 1rem (16px) | 400 | 1.6 | 0 | Default body |
| `body-sm` | 0.875rem (14px) | 400 | 1.5 | 0 | Secondary text |
| `caption` | 0.75rem (12px) | 500 | 1.5 | 0.02em | Labels, metadata |
| `overline` | 0.6875rem (11px) | 600 | 1.0 | 0.1em | Category labels, overlines |

---

## 4. Surface & Glass Logic

### Card Construction Rules

Every Nocturne card surface follows this formula:

```
border-radius: 32px (2rem)
backdrop-filter: blur(64px)  /* backdrop-blur-3xl */
background: rgba(255, 255, 255, 0.06)
border: 1px solid rgba(255, 255, 255, 0.15)  /* inner glow */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)
```

### Surface Hierarchy

| Level | Background | Blur | Border | Usage |
|-------|-----------|------|--------|-------|
| **Page** | `#0E0E0F` | none | none | Root background |
| **Panel** | `rgba(255,255,255,0.04)` | `blur(32px)` | `rgba(255,255,255,0.08)` | Sidebar, nav panels |
| **Card** | `rgba(255,255,255,0.06)` | `blur(64px)` | `rgba(255,255,255,0.15)` | Content cards, modals |
| **Elevated** | `rgba(255,255,255,0.10)` | `blur(64px)` | `rgba(255,255,255,0.20)` | Hover states, active cards |
| **Floating** | `rgba(255,255,255,0.12)` | `blur(80px)` | `rgba(255,255,255,0.25)` | Dropdowns, tooltips, popovers |

### Glow Effects

```css
/* Primary action glow */
box-shadow: 0 0 30px -5px rgba(138, 43, 226, 0.5);

/* AI/data element glow */
box-shadow: 0 0 20px -5px rgba(161, 250, 255, 0.4);

/* Hover card lift */
transform: translateY(-4px);
box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5),
            0 0 30px -5px rgba(138, 43, 226, 0.3);
```

---

## 5. Spacing & Layout

### Spacing Scale (4px base)

Same 4px grid as current — no change needed.

### Layout Constants

| Token | Value | Usage |
|-------|-------|-------|
| `--card-radius` | `32px` | Card corner radius |
| `--button-radius` | `16px` | Button corner radius |
| `--input-radius` | `16px` | Input field radius |
| `--pill-radius` | `999px` | Pill/tag radius |
| `--page-padding` | `24px` (mobile) / `48px` (desktop) | Page horizontal padding |
| `--section-gap` | `80px` (mobile) / `120px` (desktop) | Vertical section spacing |
| `--card-padding` | `24px` (mobile) / `32px` (desktop) | Internal card padding |

---

## 6. Animation & Motion

### Transition Defaults

```css
--transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
--transition-normal: 250ms cubic-bezier(0.16, 1, 0.3, 1);
--transition-slow: 400ms cubic-bezier(0.16, 1, 0.3, 1);
```

### 3D Transform Rules

- Cards use `perspective(1000px)` on the parent container
- Hover tilt: `rotateX(±5deg) rotateY(±5deg)` with `transform-style: preserve-3d`
- All 3D elements have `will-change: transform` for GPU acceleration
- Respect `prefers-reduced-motion: reduce` — disable all motion

### Voice Waveform Animation

The "Backstage AI" voice visualizer uses:
- 5 bars, each 3px wide, varying heights
- Color: `--nocturne-accent` (#A1FAFF)
- Animation: `scaleY` oscillation at staggered delays (0.1s apart)
- Idle: gentle pulse at 0.3 amplitude
- Active: full-range oscillation at 1.0 amplitude

---

## 7. Component Patterns

### Buttons

```
Primary:   bg-gradient(135deg, #8A2BE2, #6A1BB2), text-white, rounded-16px, glow-shadow
Secondary: bg-transparent, border rgba(255,255,255,0.15), text-white, rounded-16px
Ghost:     bg-transparent, text rgba(255,255,255,0.65), hover:text-white
Accent:    bg-gradient(135deg, #A1FAFF, #8A2BE2), text-#0E0E0F, rounded-16px
```

### Input Fields

```
bg: rgba(255,255,255,0.06)
border: 1px solid rgba(255,255,255,0.15)
border-radius: 16px
text: white
placeholder: rgba(255,255,255,0.4)
focus:border: #8A2BE2
focus:shadow: 0 0 0 3px rgba(138,43,226,0.2)
```

### Badges / Tags

```
bg: rgba(138,43,226,0.15)
text: #A1FAFF
border-radius: 999px
padding: 4px 12px
font-size: caption
```

### Navigation (Sidebar)

```
width: 280px (desktop), slide-over (mobile)
bg: rgba(255,255,255,0.04), backdrop-blur(32px)
border-right: 1px solid rgba(255,255,255,0.08)
nav-item-active: bg rgba(138,43,226,0.15), text #A1FAFF, left-border 3px #8A2BE2
```

---

## 8. Dark Mode Note

The Nocturne system IS the dark mode. There is no light variant. The current light-first design system (violet/zinc) is being replaced entirely for dashboard and internal screens. Public marketing pages can retain a light option if desired but dashboards are Nocturne-only.
