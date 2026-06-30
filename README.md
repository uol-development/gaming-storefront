# NEXUS — Premium Gaming Storefront

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · Motion · Zustand · TanStack Query.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Project structure

```
app/
  globals.css            Tailwind v4 + design tokens + reduced-motion backstop
  layout.tsx             Root shell (Server Component) — fonts, providers, header
  providers.tsx          TanStack Query provider (client)
  page.tsx               Placeholder home (replaced in Phase 2)
components/
  layout/
    site-header.tsx       Sticky blur-on-scroll header + cart/wishlist badges
    desktop-nav.tsx       Mega menu + layoutId active-link indicator
    mobile-nav.tsx        Slide-in drawer with accordion submenus
    nav-config.ts         Serializable nav data model
lib/
  animations/
    tokens.ts             Durations / easings / springs (no magic numbers)
    variants.ts           Shared Motion variants (transform + opacity only)
    use-reduced-motion.ts Single global reduced-motion hook
  store/                  Zustand stores (ui, cart, wishlist)
  utils.ts                cn() helper
```

## Animation rules (enforced)

- Animate only `transform` and `opacity`; layout transitions use `layout`/`layoutId`.
- Every animated component is a leaf Client Component (`"use client"`).
- All variants live in `lib/animations/`; components never inline variant objects.
- `useReducedMotion` swaps to opacity-only instant fades globally.
- No layout shift: dimensions are reserved; blur-on-scroll animates an opacity layer.

Build order is phased (see project brief) — this is **Phase 1: Foundation**.
