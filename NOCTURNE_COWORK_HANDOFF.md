# Nocturne Hollywood — Co-Work Handoff Document
## Convert All 49 Pages to Dark Theme

**Project**: Artist Booking Platform
**Design System**: Nocturne Hollywood (Dark-only, Glassmorphism-first)
**Created**: 2026-03-25
**Status**: Landing page + DashboardLayout shell DONE. Individual page interiors need conversion.

---

## MISSION

Convert every page in `apps/web/src/app/` from light-theme Tailwind classes to the **Nocturne Hollywood** design system. The design system is fully implemented in:

- **Design spec**: `apps/web/.stitch/DESIGN.md`
- **Tailwind tokens**: `apps/web/tailwind.config.ts` (all under `nocturne.*`)
- **CSS utilities**: `apps/web/src/styles/globals.css` (`.glass-card`, `.btn-nocturne-*`, `.input-nocturne`, `.badge-nocturne`, etc.)
- **Stitch PRD reference HTML**: `stitch_product_requirements_document (2)/*.html`

The `DashboardLayout.tsx` shell (sidebar, topbar, mobile nav) is already Nocturne-themed. The **inner content** of each page still uses light classes.

---

## CLASS REPLACEMENT MAP

Use this table for systematic find-and-replace within each page file. **Order matters** — do more specific patterns first.

### Backgrounds
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `bg-white` | `bg-nocturne-surface` | Card/panel backgrounds |
| `bg-neutral-50` | `bg-nocturne-base` | Page-level backgrounds |
| `bg-neutral-100` | `bg-nocturne-surface` | Muted section backgrounds |
| `bg-neutral-200` | `bg-nocturne-surface-2` | Deeper muted areas |
| `bg-gray-50` | `bg-nocturne-base` | — |
| `bg-gray-100` | `bg-nocturne-surface` | — |
| `bg-gray-200` | `bg-nocturne-surface-2` | — |
| `bg-primary-50` | `bg-nocturne-primary-light` | Highlight backgrounds |
| `bg-primary-100` | `bg-nocturne-primary-light` | — |
| `bg-primary-600` | `bg-nocturne-primary` | Primary buttons |
| `bg-primary-700` | `bg-nocturne-primary-hover` | Hover states |

### Text Colors
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `text-neutral-900` | `text-nocturne-text-primary` | Primary text |
| `text-neutral-800` | `text-nocturne-text-primary` | — |
| `text-neutral-700` | `text-nocturne-text-secondary` | Secondary text |
| `text-neutral-600` | `text-nocturne-text-secondary` | — |
| `text-neutral-500` | `text-nocturne-text-tertiary` | Muted text |
| `text-neutral-400` | `text-nocturne-text-tertiary` | Placeholder-level |
| `text-gray-900` | `text-nocturne-text-primary` | — |
| `text-gray-800` | `text-nocturne-text-primary` | — |
| `text-gray-700` | `text-nocturne-text-secondary` | — |
| `text-gray-600` | `text-nocturne-text-secondary` | — |
| `text-gray-500` | `text-nocturne-text-tertiary` | — |
| `text-gray-400` | `text-nocturne-text-tertiary` | — |
| `text-foreground` | `text-nocturne-text-primary` | Only if hardcoded light |

### Borders
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `border-neutral-200` | `border-nocturne-border-subtle` | Standard borders |
| `border-neutral-300` | `border-nocturne-border` | Stronger borders |
| `border-gray-200` | `border-nocturne-border-subtle` | — |
| `border-gray-300` | `border-nocturne-border` | — |
| `divide-neutral-200` | `divide-nocturne-border-subtle` | Table/list dividers |
| `divide-gray-200` | `divide-nocturne-border-subtle` | — |
| `ring-primary-100` | `ring-nocturne-primary-light` | Focus rings |

### Cards & Containers
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `bg-white rounded-xl border border-neutral-200 shadow-sm` | `glass-card` | Full card pattern |
| `bg-white rounded-lg border` | `glass-card rounded-xl` | Simpler cards |
| `bg-white p-6 rounded-xl shadow` | `glass-card p-6` | Cards with padding |
| `shadow-sm` | `shadow-nocturne-card` | Card shadows |
| `shadow-md` | `shadow-nocturne-card` | — |
| `shadow-lg` | `shadow-nocturne-card-hover` | Elevated shadows |
| `hover:shadow-md` | `hover:shadow-nocturne-card-hover` | Hover shadows |

### Buttons
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `btn-primary` | `btn-nocturne-primary` | Primary CTA |
| `btn-secondary` | `btn-nocturne-secondary` | Secondary action |
| `btn-ghost` | `btn-nocturne-secondary` | Ghost → secondary |
| `bg-primary-600 text-white` (inline) | `btn-nocturne-primary` | Inline button styles |

### Inputs
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `input` (class) | `input-nocturne` | Form inputs |
| `bg-white border border-neutral-200` (on inputs) | `input-nocturne` | Inline input styles |
| `placeholder:text-neutral-400` | (already in `.input-nocturne`) | — |
| `focus:border-primary-400 focus:ring-2 focus:ring-primary-100` | (already in `.input-nocturne`) | — |

### Badges & Tags
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `badge` | `badge-nocturne` | Status tags |
| `badge-primary` | `badge-nocturne` | — |
| `bg-neutral-100 text-neutral-600 rounded-full px-3 py-1` | `nocturne-chip` | Inline badge pattern |

### Dividers
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `divider` | `nocturne-divider` | Horizontal rules |
| `h-px bg-neutral-200` | `nocturne-divider` | Inline divider pattern |
| `border-b border-neutral-200` | `border-b border-nocturne-border-subtle` | If not replaceable |

### Skeleton / Loading
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `skeleton` | `nocturne-skeleton` | Loading states |
| `skeleton-text` | `nocturne-skeleton h-4` | — |
| `bg-neutral-200 animate-pulse` | `bg-nocturne-surface animate-pulse` | Inline skeleton |

### Tables
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| Standard `<table>` with light classes | Add `nocturne-table` class | Use the CSS utility |

### Hover States
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `hover:bg-neutral-50` | `hover:bg-nocturne-glass-panel` | Row/item hovers |
| `hover:bg-neutral-100` | `hover:bg-nocturne-glass-card` | Stronger hovers |
| `hover:bg-gray-50` | `hover:bg-nocturne-glass-panel` | — |
| `hover:text-neutral-900` | `hover:text-white` | — |

### Gradients & Accents
| OLD (Light) | NEW (Nocturne) | Notes |
|---|---|---|
| `text-gradient` | `text-gradient-nocturne` | Gradient text |
| `bg-gradient-primary` | `bg-gradient-nocturne` | Gradient backgrounds |
| `text-primary-600` | `text-nocturne-accent` | Accent text color |
| `text-primary-700` | `text-nocturne-primary` | Strong accent |

### Status Colors
| OLD (Light) | NEW (Nocturne) |
|---|---|
| `bg-green-50 text-green-700` | `bg-nocturne-success/15 text-nocturne-success` |
| `bg-red-50 text-red-700` | `bg-nocturne-error/15 text-nocturne-error` |
| `bg-yellow-50 text-yellow-700` | `bg-nocturne-warning/15 text-nocturne-warning` |
| `bg-blue-50 text-blue-700` | `bg-nocturne-info/15 text-nocturne-info` |
| `text-green-600` | `text-nocturne-success` |
| `text-red-600` | `text-nocturne-error` |
| `text-yellow-600` | `text-nocturne-warning` |

---

## PAGES TO CONVERT (38 files with light-theme classes)

### Priority 1: Dashboard Home Pages (high visibility)
1. `(dashboard)/artist/page.tsx` — Artist home (partially converted, check remaining light refs)
2. `(dashboard)/client/page.tsx` — Client home
3. `(dashboard)/agent/page.tsx` — Already done (verify)
4. `(dashboard)/event-company/page.tsx` — Event company home
5. `(dashboard)/admin/page.tsx` — Admin dashboard (largest file, 7 tabs)

### Priority 2: Booking Flow (revenue-critical)
6. `(dashboard)/artist/bookings/page.tsx` — Artist bookings list
7. `(dashboard)/artist/bookings/[id]/page.tsx` — Booking detail
8. `(dashboard)/client/bookings/page.tsx` — Client bookings list
9. `(dashboard)/client/bookings/[id]/page.tsx` — Booking detail
10. `(dashboard)/client/bookings/[id]/confirmation/page.tsx` — Confirmation
11. `(dashboard)/client/bookings/[id]/pay/page.tsx` — Payment flow

### Priority 3: Financial Pages
12. `(dashboard)/artist/earnings/page.tsx` — Earnings
13. `(dashboard)/artist/financial/page.tsx` — Financial/payout
14. `(dashboard)/client/payments/page.tsx` — Payment history
15. `(dashboard)/agent/commissions/page.tsx` — Commission tracking

### Priority 4: Intelligence & Analytics
16. `(dashboard)/artist/intelligence/page.tsx` — Career intelligence hub
17. `(dashboard)/artist/intelligence/gig-advisor/page.tsx` — Gig advisor
18. `(dashboard)/artist/intelligence/reputation/page.tsx` — Reputation score
19. `(dashboard)/artist/seasonal/page.tsx` — Seasonal demand

### Priority 5: Profile & Settings
20. `(dashboard)/artist/profile/page.tsx` — Artist profile management
21. `(dashboard)/artist/gamification/page.tsx` — Badges/achievements
22. `(dashboard)/artist/settings/backup/page.tsx` — Settings
23. `(dashboard)/settings/page.tsx` — Global settings

### Priority 6: Workspace (Event Company CRM)
24. `(dashboard)/client/workspace/page.tsx` — Workspace list
25. `(dashboard)/client/workspace/[id]/page.tsx` — Workspace detail
26. `(dashboard)/client/workspace/[id]/analytics/page.tsx` — Workspace analytics
27. `(dashboard)/client/workspace/[id]/commission/page.tsx` — Commission settings
28. `(dashboard)/client/workspace/[id]/presentations/page.tsx` — Presentations
29. `(dashboard)/client/workspace/[id]/settings/page.tsx` — Workspace settings
30. `(dashboard)/client/workspace/[id]/team/page.tsx` — Team members

### Priority 7: Discovery & Marketplace
31. `(dashboard)/client/shortlists/page.tsx` — Shortlists (check)
32. `(dashboard)/client/recommendations/page.tsx` — Recommendations (check)
33. `(dashboard)/client/substitutions/page.tsx` — Emergency subs
34. `(dashboard)/agent/recommendations/page.tsx` — Agent recommendations
35. `(dashboard)/gigs/page.tsx` — Gig marketplace

### Priority 8: Onboarding Flows
36. `(dashboard)/artist/onboarding/page.tsx` — Artist onboarding (check)
37. `(dashboard)/artist/onboarding/social/page.tsx` — Social linking
38. `(dashboard)/agent/onboarding/page.tsx` — Agent onboarding
39. `(dashboard)/event-company/onboarding/page.tsx` — EC onboarding (check)
40. `(dashboard)/client/onboarding/page.tsx` — Client onboarding (check)

### Priority 9: Utility Pages
41. `(dashboard)/voice/page.tsx` — Voice assistant
42. `(dashboard)/notifications/page.tsx` — Notifications (check)
43. `(public)/presentations/[slug]/page.tsx` — **KEEP LIGHT** (client-facing proposal)
44. `help/page.tsx` — Help center
45. `privacy/page.tsx` — Privacy policy
46. `terms/page.tsx` — Terms of service
47. `error.tsx` — Error boundary
48. `not-found.tsx` — 404 page
49. `test/page.tsx` — Test page (low priority)

---

## EXECUTION RULES

### For each page file:
1. **Read** the full file
2. **Apply** the class replacement map above
3. **Verify** no light-theme classes remain (`bg-white`, `bg-neutral-*`, `text-neutral-*`, `border-neutral-*`, `bg-gray-*`, `text-gray-*`, `border-gray-*`)
4. **Preserve** all logic, state, API calls, imports — ONLY change Tailwind classes
5. **Use glass-card** for any card/container that was `bg-white rounded-* border shadow`
6. **Use nocturne-divider** instead of `border-b border-neutral-200`
7. **Keep functional color semantics** — green = success, red = error, yellow = warning, but use `nocturne-success/error/warning` tokens

### Design Rules to Follow:
- **No-Line Rule**: Prefer background color shifts over borders. Use `nocturne-divider` (1px rgba) not `border-neutral-*`
- **Glass & Gradient**: Cards should use `glass-card` class. CTAs use `btn-nocturne-primary`
- **Ghost Border Fallback**: If a border MUST exist, use `border-nocturne-border-subtle` (8% opacity)
- **Depth**: Every surface should feel layered — base → surface → surface-2 → glass
- **Breathing room**: If a section looks crowded after conversion, increase spacing

### Special Cases:
- `(public)/presentations/[slug]/page.tsx` — **SKIP**. This is a client-facing proposal page that intentionally uses light theme for print/PDF compatibility
- `(dashboard)/admin/page.tsx` — Large file with 7 tab panels. Each tab panel interior needs conversion separately
- Status badges: Use `bg-nocturne-{status}/15 text-nocturne-{status}` pattern (15% opacity background)
- Inline `style=` attributes with light colors should also be converted to Nocturne tokens

---

## REFERENCE DESIGNS (Stitch PRD)

The `stitch_product_requirements_document (2)/` folder contains reference HTML files for key screens. Use these as visual targets when the page type matches:

| Page | Reference HTML |
|---|---|
| Event Company Dashboard | `code_event_dashboard_hollywood_cinematic_*.html` |
| Artist Management | `code_artist_management_hollywood_glamour_*.html` |
| Artist Portfolio | `code_artist_portfolio_hollywood_glamour_*.html` |
| Escrow Wallet | `code_escrow_wallet_hollywood_glamour_*.html` |
| AI Discovery/Search | `code_artist_discovery_hollywood_cinematic_*.html` |
| AI Presentation Builder | `code_ai_presentation_builder_hollywood_glamour_*.html` |
| AI Mediation | `code_ai_mediation_hollywood_glamour_*.html` |
| Arbitrator Hub | `code_arbitrator_hub_hollywood_glamour_*.html` |
| Final Ruling | `code_final_ruling_escrow_execution_*.html` |
| Onboarding | `code_onboarding_welcome_hollywood_glamour_*.html` |
| Master Blueprint | `master_hollywood_blueprint_with_full_code.html` |

---

## VERIFICATION

After converting all pages, run these checks:

```bash
# 1. No remaining light-theme classes in dashboard pages
cd apps/web/src/app
grep -rn "bg-white\|bg-neutral-50\|bg-neutral-100\|text-neutral-900\|text-neutral-800\|text-neutral-700\|border-neutral-200" --include="*.tsx" | grep -v "presentations/\[slug\]"

# 2. Build succeeds
cd ../..
pnpm build

# 3. Visual check — start dev server and navigate each route
pnpm dev
```

Expected result: Zero matches from grep (excluding presentations/[slug]).

---

## DESIGN SYSTEM QUICK REFERENCE

### Color Tokens (Tailwind)
```
bg-nocturne-base        → #0E0E0F (page bg)
bg-nocturne-surface     → #1A1A1D (cards)
bg-nocturne-surface-2   → #242428 (elevated)
bg-nocturne-primary     → #8A2BE2 (brand)
bg-nocturne-accent      → #A1FAFF (AI/data)
text-nocturne-text-primary   → #FFFFFF
text-nocturne-text-secondary → rgba(255,255,255,0.65)
text-nocturne-text-tertiary  → rgba(255,255,255,0.4)
border-nocturne-border-subtle → rgba(255,255,255,0.08)
border-nocturne-border        → rgba(255,255,255,0.15)
```

### CSS Utility Classes
```
.glass-card             → Frosted glass card (blur 64px, 6% white, 15% border, 32px radius)
.glass-panel            → Subtle panel (blur 32px, 4% white, 8% border)
.glass-floating         → Floating element (blur 80px, 12% white, 25% border)
.btn-nocturne-primary   → Purple gradient CTA with glow
.btn-nocturne-secondary → Transparent with 15% white border
.btn-nocturne-accent    → Cyan-to-purple gradient, dark text
.input-nocturne         → Dark input with 6% white bg, purple focus ring
.badge-nocturne         → Purple bg 15%, cyan text, pill shape
.nocturne-chip          → Semi-transparent pill tag
.nocturne-divider       → 1px rgba white 6% (No-Line Rule)
.nocturne-table         → Dark table with subtle row borders
.nocturne-skeleton      → Dark shimmer loading state
.text-gradient-nocturne → Purple-to-cyan gradient text
.nocturne-nav-item      → Sidebar nav item
.nocturne-nav-item-active → Active nav with cyan text + purple accent
```

### Shadows
```
shadow-nocturne-card       → Standard card depth
shadow-nocturne-card-hover → Elevated + purple glow on hover
shadow-nocturne-glow-purple → Purple ambient glow
shadow-nocturne-glow-cyan   → Cyan ambient glow
```

### Gradients
```
bg-gradient-nocturne        → Purple CTA gradient
bg-gradient-nocturne-accent → Purple-to-cyan
bg-gradient-nocturne-hero   → Radial hero background
bg-gradient-nocturne-card   → Subtle glass edge gradient
```

---

## DONE CRITERIA

- [ ] All 38 files converted (excluding presentations/[slug])
- [ ] Zero `bg-white`/`bg-neutral-*`/`text-neutral-*`/`border-neutral-*`/`bg-gray-*`/`text-gray-*` in dashboard pages
- [ ] `pnpm build` passes with no errors
- [ ] Every page visually renders on dark background with readable text
- [ ] Status colors use nocturne tokens (success/error/warning/info)
- [ ] Cards use `glass-card` pattern
- [ ] Buttons use `btn-nocturne-*` pattern
- [ ] Inputs use `input-nocturne` pattern
