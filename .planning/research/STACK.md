# Stack Research

**Domain:** Offline-first installable PWA, single-user health tracker
**Researched:** 2026-04-19
**Confidence:** HIGH (versions verified against npm registry; all core choices verified via official docs or Context7)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.5 | UI framework | Largest ecosystem, best tooling for solo dev. React 19 adds the compiler (automatic memoization) and improved async primitives. Familiarity ceiling is low; rich component library ecosystem means less custom code for a fast MVP. Svelte is compelling but the charting and heatmap component ecosystem is React-first. |
| Vite | 8.0.8 | Build tool & dev server | De facto standard for client-only SPAs in 2026. Sub-second HMR, native ESM, and first-class `@vitejs/plugin-react` support. Avoids webpack complexity entirely. |
| TypeScript | 5.x (bundled with Vite) | Type safety | Strongly recommended even for solo dev. Dexie's `EntityTable` typing makes schema changes safe. Forms typed against Zod schemas. Minimal overhead with Vite's `--template react-ts`. |
| vite-plugin-pwa | 1.2.0 | Service worker, web app manifest, offline caching | Zero-config Workbox integration. Handles precaching, manifest injection, and install prompts. Works with React out of the box. **Note:** Vite 8 peer dependency not yet officially declared — use `--legacy-peer-deps` or pin Vite to 7.x until 1.3 releases. Alternatively, use Vite 7 for zero friction. |
| Dexie.js | 4.4.2 | IndexedDB wrapper | The definitive IndexedDB library. `useLiveQuery()` hook makes IndexedDB reactive inside React components (auto-rerenders when data changes), eliminating the need for a separate data-sync layer. `EntityTable<T, PK>` gives full TypeScript inference. Version 4.4 is actively maintained (released March 2026). |
| Tailwind CSS | 4.2.2 | Utility-first styling | Fastest path to a dark-mode, minimal aesthetic. v4 uses CSS-native variables (no JS config file) and the `@tailwindcss/vite` plugin keeps the build pipeline simple. Dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in CSS + localStorage toggle. |
| shadcn/ui | latest (CLI-based) | Headless component library | Copies components into your source tree — no runtime dependency, fully offline-compatible. Provides accessible inputs, dialogs, progress bars, sliders already styled with Tailwind tokens. Dark mode is built-in. Replaces writing 80% of UI primitives from scratch. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 3.8.1 | Charts (macro progress bars, trend lines) | Use for daily macro progress (bar/radial charts) and any trend visualizations. SVG-based, React-native, composable. Lightweight at ~120KB gzipped with tree-shaking. |
| react-activity-calendar | 3.1.1 | Streak calendar / heatmap | Purpose-built calendar heatmap component (GitHub contribution graph style). Dark mode via `colorScheme` prop and custom `theme` prop. Supports custom activity levels — map to the 4-segment indicator states. Actively maintained (2 months ago). Use this instead of building the calendar from scratch. |
| React Hook Form | 7.72.1 | Form state management | Uncontrolled-input approach means zero re-renders on keystroke. 8.6KB gzipped, zero deps. Use for every data-entry form: food log, PT session, step entry, daily check-in. |
| Zod | 3.25.x | Schema validation + TypeScript inference | Pair with React Hook Form via `@hookform/resolvers/zod`. Define schemas once; get TypeScript types + runtime validation for free. Keeps Dexie schemas and form schemas in sync. |
| Zustand | 5.0.12 | Ephemeral UI state | Use only for transient state that doesn't belong in Dexie: currently selected date, active tab, modal open/close. ~3KB gzipped. Do NOT use Zustand for data that needs persistence — that lives in Dexie. |
| dexie-react-hooks | 4.4.x | React hooks for Dexie | Ships `useLiveQuery()`. Install alongside Dexie. Makes any Dexie query reactive. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `create-vite` (react-ts template) | Project scaffold | `npm create vite@latest healthtracker -- --template react-ts` |
| ESLint + `@eslint/js` + `typescript-eslint` | Linting | Ships with Vite react-ts template. Minimal config. |
| Prettier | Formatting | Single-person project, but prevents cognitive load from formatting decisions. Add `prettier-plugin-tailwindcss` to auto-sort class names. |
| Lighthouse CLI / Chrome DevTools | PWA audit | Validate installability, offline capability, manifest correctness before shipping. Free, no setup. |

---

## Installation

```bash
# 1. Scaffold project
npm create vite@latest healthtracker -- --template react-ts
cd healthtracker

# 2. Core PWA + offline
npm install -D vite-plugin-pwa workbox-precaching workbox-routing

# 3. Styling
npm install -D tailwindcss @tailwindcss/vite
npm install class-variance-authority clsx tailwind-merge  # used by shadcn/ui

# 4. shadcn/ui (interactive CLI, run after Tailwind is configured)
npx shadcn@latest init

# 5. IndexedDB
npm install dexie dexie-react-hooks

# 6. Forms + validation
npm install react-hook-form zod @hookform/resolvers

# 7. State
npm install zustand

# 8. Charting + calendar
npm install recharts react-activity-calendar
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React 19 | Svelte 5 | If bundle size is a hard constraint (Svelte: ~5KB vs React: ~42KB gzipped). Svelte 5 is excellent but has fewer ready-made PWA charting and heatmap components; you'd hand-build more. Not worth it for a 1-week MVP on a solo project where React is already familiar. |
| React 19 | SolidJS | Only if fine-grained reactivity matters at scale (1000+ simultaneously updating DOM nodes). Overkill here. Much smaller community = harder to find component answers fast. |
| Vite 8 | Vite 7 | Use Vite 7 (pin to `^7.0.0`) if vite-plugin-pwa peer-dep warnings are disruptive. Vite 7 is still actively maintained as of April 2026. |
| Dexie 4 | idb (by Jake Archibald) | Use `idb` only if you want a minimal low-level wrapper with no query layer. Dexie is strictly better for this project because `useLiveQuery` eliminates manual subscription wiring. |
| Dexie 4 | RxDB | RxDB adds replication/sync features you explicitly don't need. Heavier. Avoid. |
| Recharts | Chart.js / react-chartjs-2 | Chart.js is canvas-based, which makes dark mode theming messier. Recharts SVG integrates naturally with CSS custom properties from Tailwind. Stick with Recharts. |
| react-activity-calendar | react-calendar-heatmap | `react-calendar-heatmap` is less maintained (last major update 2022) and has no built-in dark mode. `react-activity-calendar` has active releases and a `colorScheme` prop. |
| shadcn/ui | Radix UI (bare) | shadcn/ui wraps Radix UI and pre-applies Tailwind styling. Using bare Radix saves nothing for solo dev — shadcn is literally copying files you own. |
| shadcn/ui | Mantine / Chakra UI | Both ship large runtime CSS-in-JS bundles that conflict with Tailwind's approach. Avoid for this stack. |
| Zustand | Jotai | Jotai is excellent for atomic derived state. Zustand is marginally simpler API for a project where UI state is coarse-grained (tab selection, modal flags). Use Zustand; switch to Jotai only if derived state complexity grows. |
| React Hook Form | Formik | Formik is controlled-input and causes re-renders on every keystroke. React Hook Form is faster and smaller. No reason to use Formik in 2026. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js | Server-side rendering adds zero value for a fully-local, no-backend app. `next/headers`, RSC, routing middleware all create dead weight and complicate the offline service worker model. | Vite + React SPA |
| Create React App (CRA) | Unmaintained since 2023. Webpack 4 based, no Vite. Produces larger bundles, slower builds. | `create-vite` react-ts template |
| Redux / Redux Toolkit | Massive boilerplate for a single-user app where Dexie handles all persistence and Zustand handles transient UI state. Adds 40KB+ to bundle. | Zustand (3KB) |
| Firebase / Supabase | Require network. Conflict with fully-local offline requirement. Even their offline SDKs are designed for sync, not permanent local-only. | Dexie IndexedDB |
| Workbox (raw, no vite-plugin-pwa) | Writing service worker registration and manifest by hand is error-prone and fragile. The plugin handles it reliably. | vite-plugin-pwa |
| Mantine / Chakra UI | CSS-in-JS runtimes bloat bundle and fight with Tailwind class utilities. Mantine v7 moved to CSS modules, but still ~60KB. | shadcn/ui (zero runtime) |
| Victory charts | More complex API than Recharts, steeper learning curve, no practical advantage for the chart types this app needs (bar, radial/gauge, simple line). | Recharts |
| RxDB | Replication and sync layer you explicitly don't need. Adds heavy dependencies. Overkill. | Dexie |
| React Context for data | Context re-renders entire subtrees on change. Dexie + useLiveQuery is already reactive and scoped. Don't duplicate it with Context. | Dexie `useLiveQuery` |

---

## Stack Patterns by Variant

**If you hit vite-plugin-pwa / Vite 8 peer-dep errors:**
- Pin Vite to `^7.0.0` in package.json
- Everything else stays identical
- Revisit when vite-plugin-pwa 1.3 is released (track the Vite 8 issue at github.com/vite-pwa/vite-plugin-pwa/issues/918)

**For the 4-segment day indicator (core streak loop):**
- Do NOT use Recharts for this — it's a custom SVG shape
- Build a single `DayCell.tsx` component with 4 SVG arc segments
- Each segment is filled/unfilled based on the day's Dexie record
- `react-activity-calendar` renders the month grid; `DayCell` is the custom `renderBlock` prop

**For dark mode:**
- Store preference in `localStorage` (key: `theme`)
- Apply `.dark` class on `<html>` element on mount
- Tailwind's `@custom-variant dark (&:where(.dark, .dark *))` handles all dark: utility classes
- shadcn/ui uses the same `.dark` class — no extra configuration needed

**If the food library grows large (500+ items):**
- Dexie's `where().startsWith()` query handles fuzzy search client-side for moderate sizes
- Do not add Fuse.js until you actually hit a usability problem — premature optimization

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vite-plugin-pwa@1.2.0 | vite@^7.0.0 | Officially supported. Works with Vite 8 in practice but peer dep warning. Pin to Vite 7 for clean builds. |
| dexie@4.4.2 | react@19.x | Fully compatible. `useLiveQuery` works with React 19's concurrent renderer. |
| recharts@3.8.1 | react@19.x | Compatible. Recharts 3.x supports React 18+; React 19 is a non-breaking upgrade. |
| react-activity-calendar@3.1.1 | react@19.x | Actively maintained; React 19 compatible per release notes. |
| tailwindcss@4.2.2 | vite@7.x / 8.x | Use `@tailwindcss/vite` plugin (not PostCSS). Works with both Vite versions. |
| shadcn/ui (CLI) | tailwindcss@4.x + react@19 | shadcn CLI v4 (March 2026) added Vite + Tailwind v4 template support. |
| react-hook-form@7.72.1 | react@19.x | Fully compatible. Library authors confirmed React 19 support in 2025. |
| zustand@5.0.12 | react@19.x | Zustand 5 was released specifically to support React 18/19 concurrent features. |

---

## Primary Stack Summary

```
React 19 + Vite 7 + TypeScript
  └── PWA:       vite-plugin-pwa 1.2 (Workbox precaching, manifest)
  └── Storage:   Dexie 4.4 + dexie-react-hooks (useLiveQuery)
  └── Styling:   Tailwind CSS 4.2 + shadcn/ui
  └── Charts:    Recharts 3.8
  └── Calendar:  react-activity-calendar 3.1
  └── Forms:     React Hook Form 7.7 + Zod
  └── UI State:  Zustand 5
```

**Alternate stack (if you want smaller bundle / no framework runtime):**
Svelte 5 + SvelteKit (static adapter) + @vite-pwa/sveltekit + Dexie + Tailwind CSS 4. Trade: ~30KB smaller JS budget, faster TTI on mobile. Cost: fewer ready-made components for the heatmap and charting use cases, no shadcn/ui equivalent, more from-scratch work. Not recommended given the 1-week MVP goal.

---

## Sources

- [vite-pwa/vite-plugin-pwa — Context7 docs](https://context7.com/vite-pwa/vite-plugin-pwa/llms.txt) — service worker registration, offline patterns (HIGH confidence)
- [Dexie docs — Context7](https://dexie.org/docs/Typescript) — TypeScript schema definition, EntityTable (HIGH confidence)
- [vite-plugin-pwa npm](https://www.npmjs.com/package/vite-plugin-pwa) — version 1.2.0 confirmed (HIGH confidence)
- [Dexie npm / Medium release notes](https://medium.com/dexie-js/dexie-4-4-dexie-cloud-server-3-0-the-big-one-d883b98599e8) — version 4.4.2, March 2026 (HIGH confidence)
- [Vite 8 release announcement](https://vite.dev/blog/announcing-vite8) — version 8.0.8 confirmed (HIGH confidence)
- [Tailwind CSS v4.2 — InfoQ](https://www.infoq.com/news/2026/04/tailwind-css-4-2-webpack/) — version 4.2.2, April 2026 (HIGH confidence)
- [Recharts npm](https://www.npmjs.com/package/recharts) — version 3.8.1 (HIGH confidence)
- [react-activity-calendar npm](https://www.npmjs.com/package/react-activity-calendar) — version 3.1.1, dark mode confirmed (HIGH confidence)
- [React Hook Form npm](https://www.npmjs.com/package/react-hook-form) — version 7.72.1 (HIGH confidence)
- [Zustand npm](https://www.npmjs.com/package/zustand) — version 5.0.12 (HIGH confidence)
- [React npm](https://www.npmjs.com/package/react) — version 19.2.5, April 2026 (HIGH confidence)
- [vite-plugin-pwa Vite 8 issue](https://github.com/vite-pwa/vite-plugin-pwa/issues/918) — peer dep limitation confirmed, works in practice (MEDIUM confidence)
- [Tailwind v4 dark mode discussion](https://github.com/tailwindlabs/tailwindcss/discussions/16925) — @custom-variant requirement confirmed (HIGH confidence)
- [State Management 2026 comparison](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge) — Zustand 5 positioning (MEDIUM confidence)

---

*Stack research for: offline-first installable PWA health tracker (React, no backend)*
*Researched: 2026-04-19*
