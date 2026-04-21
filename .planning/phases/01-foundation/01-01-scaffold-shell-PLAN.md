---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - vite.config.ts
  - tsconfig.json
  - tsconfig.node.json
  - tsconfig.app.json
  - index.html
  - .gitignore
  - .eslintrc.cjs
  - .prettierrc
  - components.json
  - src/main.tsx
  - src/App.tsx
  - src/styles/tokens.css
  - src/styles/index.css
  - src/components/AppShell.tsx
  - src/components/TabBar.tsx
  - src/components/Banner.tsx
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ui/sheet.tsx
  - src/lib/utils.ts
  - src/routes/TodayScreen.tsx
  - src/routes/CalendarScreen.tsx
  - src/routes/SettingsScreen.tsx
  - src/vite-env.d.ts
  - public/favicon.ico
autonomous: true
requirements: [SETUP-04]
tags: [scaffold, react, vite, tailwind, shadcn, app-shell, routing, dark-theme]

must_haves:
  truths:
    - "npm run dev starts Vite 7 dev server on localhost with no errors"
    - "npm run build completes without TypeScript errors"
    - "App renders in dark mode on first paint (no flash of light content)"
    - "Bottom tab bar shows 3 tabs (Today, Calendar, Settings) and active tab is accent-colored"
    - "Clicking a tab navigates via hash route (/#/today, /#/calendar, /#/settings)"
    - "Today screen renders 4 labeled placeholder cards (PT, Food, Steps, Lift) with exact D-05 copy"
    - "Safe-area insets are applied to top header and bottom tab bar"
  artifacts:
    - path: "package.json"
      provides: "Pinned dependency versions"
      contains: "\"vite\": \"^7"
    - path: "src/styles/tokens.css"
      provides: "Locked dark design tokens per D-15/D-16/D-17"
      contains: "--bg: #09090b"
    - path: "src/components/AppShell.tsx"
      provides: "Root layout with header, outlet, bottom tab bar, banner slots"
      min_lines: 30
    - path: "src/routes/TodayScreen.tsx"
      provides: "Today screen with 4 labeled placeholder sections per D-05"
      contains: "PT — not logged yet"
    - path: "components.json"
      provides: "shadcn/ui config for Tailwind v4"
  key_links:
    - from: "src/main.tsx"
      to: "src/App.tsx"
      via: "createRoot render"
      pattern: "createRoot.*App"
    - from: "src/App.tsx"
      to: "react-router-dom HashRouter"
      via: "HashRouter wrapping AppShell"
      pattern: "HashRouter"
    - from: "src/components/AppShell.tsx"
      to: "src/components/TabBar.tsx"
      via: "bottom tab bar render"
      pattern: "TabBar"
    - from: "src/styles/index.css"
      to: "src/styles/tokens.css"
      via: "@import"
      pattern: "@import.*tokens.css"
---

<objective>
Scaffold the Vite 7 + React 19 + TypeScript project, install locked dependencies (pinned per STACK.md), configure Tailwind CSS v4 with the locked design tokens, initialize shadcn/ui with Button/Card/Sheet, and build the AppShell with hash routing across Today/Calendar/Settings. The Today screen renders the 4 labeled placeholder sections per D-05; Calendar + Settings render stubs. PWA integration, data layer, and startup banners are deliberately excluded — this plan ships a running dark-themed shell that Plans 02 and 03 will extend in parallel.

Purpose: Deliver the dark app shell that satisfies SETUP-04 and creates the file structure Plans 02/03 hook into. Without this, neither the data layer nor the PWA wiring has a host to live in.
Output: A runnable SPA with dark shell, 3 routes, and 4 placeholder Today cards.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@.planning/phases/01-foundation/01-UI-SPEC.md
@CLAUDE.md

<interfaces>
<!-- These are the contracts this plan establishes that Plans 02 and 03 will consume. -->

From src/styles/tokens.css (Plan 03 consumes for banners; Phase 3 consumes alpha ramp):
```css
:root {
  --bg: #09090b;
  --surface: #18181b;
  --border: #27272a;
  --muted: #a1a1aa;
  --text: #fafafa;
  --accent: #22c55e;
  --accent-25: rgba(34, 197, 94, 0.25);
  --accent-50: rgba(34, 197, 94, 0.50);
  --accent-75: rgba(34, 197, 94, 0.75);
  --accent-100: #22c55e;
}
```

From src/components/Banner.tsx (Plan 03 renders Install + Eviction banners):
```typescript
export interface BannerProps {
  title: string;
  body: string;
  variant?: 'default' | 'warning';
  primaryAction?: { label: string; onClick: () => void };
  onDismiss: () => void;
}
export function Banner(props: BannerProps): JSX.Element;
```

From src/components/AppShell.tsx (Plan 03 mounts banners above the route outlet):
```typescript
// AppShell renders: header > banner slot > route outlet > bottom tab bar
// Plan 03 inserts Install and Eviction banners into the banner slot.
```

From src/routes/SettingsScreen.tsx (Plan 03 extends with Install card + version line):
```typescript
// Initial stub exports the screen; Plan 03 extends with Install card and version line.
export function SettingsScreen(): JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold Vite 7 + React 19 + TypeScript project, install locked deps, configure tooling</name>
  <files>
    package.json,
    package-lock.json,
    vite.config.ts,
    tsconfig.json,
    tsconfig.app.json,
    tsconfig.node.json,
    index.html,
    .gitignore,
    .eslintrc.cjs,
    .prettierrc,
    src/vite-env.d.ts
  </files>
  <read_first>
    - .planning/research/STACK.md (locked versions)
    - .planning/phases/01-foundation/01-RESEARCH.md §4 (Vite pinning note; index.html apple-touch-icon gotcha — note to Plan 03 only)
    - CLAUDE.md (Vite 7 pin rationale; do NOT use Vite 8)
    - .planning/phases/01-foundation/01-CONTEXT.md (tech decisions)
  </read_first>
  <action>
    Working directory: `/Users/anirudhchatterjee/dev/healthtracker`.

    1. Run `npm create vite@latest . -- --template react-ts` interactively (or set up package.json manually if interactive install is not available). Choose: React + TypeScript (NOT swc variant — use the standard `@vitejs/plugin-react` per RESEARCH.md §4). If the directory is not empty (it has `.planning/` and `CLAUDE.md`), use a manual scaffold: `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/index.css`, `.gitignore`.

    2. Edit `package.json` to PIN EXACT MAJOR VERSIONS (non-negotiable per CLAUDE.md + STACK.md):
       ```json
       {
         "name": "healthtracker",
         "private": true,
         "version": "0.1.0",
         "type": "module",
         "scripts": {
           "dev": "vite",
           "build": "tsc -b && vite build",
           "preview": "vite preview",
           "typecheck": "tsc -b --noEmit",
           "lint": "eslint . --ext .ts,.tsx"
         },
         "dependencies": {
           "react": "^19.0.0",
           "react-dom": "^19.0.0",
           "react-router-dom": "^7.0.0",
           "dexie": "^4.0.11",
           "dexie-react-hooks": "^1.1.7",
           "lucide-react": "^0.468.0",
           "clsx": "^2.1.1",
           "tailwind-merge": "^2.5.0",
           "class-variance-authority": "^0.7.0"
         },
         "devDependencies": {
           "@types/react": "^19.0.0",
           "@types/react-dom": "^19.0.0",
           "@vitejs/plugin-react": "^4.3.0",
           "typescript": "^5.6.0",
           "vite": "^7.0.0",
           "vite-plugin-pwa": "^1.2.0",
           "tailwindcss": "^4.0.0",
           "@tailwindcss/vite": "^4.0.0",
           "eslint": "^9.0.0",
           "@typescript-eslint/parser": "^8.0.0",
           "@typescript-eslint/eslint-plugin": "^8.0.0",
           "eslint-plugin-react-hooks": "^5.0.0",
           "eslint-plugin-react-refresh": "^0.4.0",
           "prettier": "^3.3.0"
         }
       }
       ```
       CRITICAL: `"vite": "^7.0.0"` NOT `^8`. `"tailwindcss": "^4"` NOT v3. Reason: CLAUDE.md line "Pin Vite to 7.x until vite-plugin-pwa 1.3 resolves Vite 8 peer-dep warnings".

    3. Run `npm install` and verify it completes without peer-dep ERRORS (peer-dep WARNINGS for vite-plugin-pwa are expected and acceptable in 7.x per STACK.md).

    4. Configure `vite.config.ts` (PWA block deliberately NOT added here — Plan 03 adds it):
       ```typescript
       import { defineConfig } from 'vite';
       import react from '@vitejs/plugin-react';
       import tailwindcss from '@tailwindcss/vite';

       export default defineConfig({
         plugins: [react(), tailwindcss()],
       });
       ```

    5. Configure `tsconfig.json` (references) and `tsconfig.app.json` with `strict: true`, `target: ES2022`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`. Include `"paths": { "@/*": ["./src/*"] }` in `tsconfig.app.json` for shadcn compatibility.

    6. Configure `index.html` minimal template (Plan 03 adds the `apple-touch-icon` link and PWA meta per RESEARCH.md §4):
       ```html
       <!doctype html>
       <html lang="en" class="dark">
         <head>
           <meta charset="UTF-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
           <meta name="theme-color" content="#09090b" />
           <title>HealthTracker</title>
         </head>
         <body>
           <div id="root"></div>
           <script type="module" src="/src/main.tsx"></script>
         </body>
       </html>
       ```
       NOTE: `class="dark"` is added at SSR-time so the initial paint has the dark class set even before React mounts (prevents theme flash). Plan 03's `initApp()` also sets it programmatically for defense in depth per D-19.

    7. Configure `.eslintrc.cjs` with `@typescript-eslint/parser` + React Hooks rules, and `.prettierrc` with `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }` (Claude's Discretion per CONTEXT.md).

    8. Configure `.gitignore` to include: `node_modules`, `dist`, `.DS_Store`, `*.local`, `.env*`, and `dev-dist` (vite-plugin-pwa dev artifacts, for Plan 03).

    9. Run `npm run dev` and confirm it starts on localhost:5173 with no errors. Stop the server.
  </action>
  <acceptance_criteria>
    - `package.json` exists and `grep -c '"vite": "\^7' package.json` returns `1` (Vite is pinned to ^7, NOT ^8).
    - `grep -c '"tailwindcss": "\^4' package.json` returns `1`.
    - `grep -c '"react": "\^19' package.json` returns `1`.
    - `grep -c '"dexie": "\^4' package.json` returns `1`.
    - `grep -c '"vite-plugin-pwa": "\^1' package.json` returns `1`.
    - `node_modules/vite/package.json` shows major version 7 (`node -p "require('./node_modules/vite/package.json').version"` starts with `7.`).
    - `npm run build` exits with code 0.
    - `npm run typecheck` exits with code 0.
    - `grep -c 'class="dark"' index.html` returns `1` (dark-theme default).
    - `grep -c 'viewport-fit=cover' index.html` returns `1` (safe-area prerequisite).
    - `vite.config.ts` contains `tailwindcss()` plugin invocation (Tailwind v4 Vite plugin wired).
    - `vite.config.ts` does NOT yet contain `VitePWA` (Plan 03 adds it; grep for `VitePWA` returns 0).
  </acceptance_criteria>
  <verify>
    <automated>npm install && npm run typecheck && npm run build</automated>
  </verify>
  <done>Vite 7 + React 19 + TS scaffold builds cleanly; all dependencies pinned per STACK.md; dark class applied in index.html; no PWA wiring yet (reserved for Plan 03).</done>
</task>

<task type="auto">
  <name>Task 2: Create design tokens, Tailwind v4 @theme, initialize shadcn/ui, install Button/Card/Sheet</name>
  <files>
    src/styles/tokens.css,
    src/styles/index.css,
    components.json,
    src/lib/utils.ts,
    src/components/ui/button.tsx,
    src/components/ui/card.tsx,
    src/components/ui/sheet.tsx,
    src/main.tsx
  </files>
  <read_first>
    - src/styles/tokens.css (does not exist yet — creating)
    - .planning/phases/01-foundation/01-RESEARCH.md §5 (Tailwind v4 @theme + tokens.css wiring; exact CSS block to transcribe)
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Color" (D-15/D-16/D-17 locked hex values; alpha ramp tokens MUST exist even though only Phase 3 renders them)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-15, D-16, D-17, D-18, D-19)
  </read_first>
  <action>
    1. Create `src/styles/tokens.css` with the EXACT locked hex values from RESEARCH.md §5 / CONTEXT.md D-15 through D-17. These values are NON-NEGOTIABLE; transcribe verbatim:
       ```css
       /* src/styles/tokens.css — Locked dark-mode design tokens (D-15, D-16, D-17). */
       :root {
         --bg:      #09090b;
         --surface: #18181b;
         --border:  #27272a;
         --muted:   #a1a1aa;
         --text:    #fafafa;

         --accent:      #22c55e;
         --accent-25:   rgba(34, 197, 94, 0.25);
         --accent-50:   rgba(34, 197, 94, 0.50);
         --accent-75:   rgba(34, 197, 94, 0.75);
         --accent-100:  #22c55e;
       }
       ```
       The alpha-ramp tokens MUST be declared in Phase 1 even though only Phase 3 renders them (per UI-SPEC.md "DayCell alpha-ramp tokens — declared but unused in Phase 1").

    2. Create `src/styles/index.css` (global stylesheet, Tailwind v4 entry). Transcribe the RESEARCH.md §5 `@theme` block:
       ```css
       @import './tokens.css';
       @import 'tailwindcss';

       @theme {
         --color-bg:      var(--bg);
         --color-surface: var(--surface);
         --color-border:  var(--border);
         --color-muted:   var(--muted);
         --color-text:    var(--text);
         --color-accent:  var(--accent);
       }

       html { background-color: var(--bg); color: var(--text); }
       body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; }

       /* Safe-area support for iPhone notch + home indicator (D-04) */
       .safe-area-top    { padding-top:    env(safe-area-inset-top); }
       .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
       ```
       This produces Tailwind utilities: `bg-bg`, `bg-surface`, `text-muted`, `border-border`, `text-accent`, etc.

    3. Edit `src/main.tsx` to import `./styles/index.css` at the top (replaces any default `./index.css` import from the Vite scaffold).

    4. Create `src/lib/utils.ts` (shadcn convention — `cn()` helper):
       ```typescript
       import { clsx, type ClassValue } from 'clsx';
       import { twMerge } from 'tailwind-merge';

       export function cn(...inputs: ClassValue[]): string {
         return twMerge(clsx(inputs));
       }
       ```

    5. Create `components.json` (shadcn/ui Tailwind v4 config):
       ```json
       {
         "$schema": "https://ui.shadcn.com/schema.json",
         "style": "new-york",
         "rsc": false,
         "tsx": true,
         "tailwind": {
           "config": "",
           "css": "src/styles/index.css",
           "baseColor": "zinc",
           "cssVariables": true
         },
         "aliases": {
           "components": "@/components",
           "utils": "@/lib/utils",
           "ui": "@/components/ui"
         },
         "iconLibrary": "lucide"
         }
       ```
       The `"config": ""` empty-string form signals Tailwind v4 mode (no `tailwind.config.js`).

    6. Install shadcn/ui components: `npx shadcn@latest add button card sheet --yes` (or manually create minimal versions of each in `src/components/ui/` if the CLI fails in a non-interactive environment). Components will use the `cn()` helper and Tailwind v4 utilities referencing the `@theme` variables.

    7. In `main.tsx`, ensure `document.documentElement.classList.add('dark')` is called before render (D-19 — defense in depth on top of `index.html` class attribute). Plan 03's `initApp()` will fold this into a larger startup sequence but placing it here keeps dark-theme render correct even if Plan 03 slips.
  </action>
  <acceptance_criteria>
    - `grep -c '#09090b' src/styles/tokens.css` returns `1` (exact hex per D-15).
    - `grep -c '#22c55e' src/styles/tokens.css` returns `2` (accent hex appears on TWO lines: `--accent` per D-16 AND `--accent-100` per D-17).
    - `grep -cE '^\s*--accent:\s*#22c55e' src/styles/tokens.css` returns `1` (primary accent value locked per D-16).
    - `grep -c 'rgba(34, 197, 94, 0.25)' src/styles/tokens.css` returns `1` (D-17 alpha ramp 1/4).
    - `grep -c 'rgba(34, 197, 94, 0.50)' src/styles/tokens.css` returns `1` (D-17 alpha ramp 2/4).
    - `grep -c 'rgba(34, 197, 94, 0.75)' src/styles/tokens.css` returns `1` (D-17 alpha ramp 3/4).
    - `grep -c '@theme' src/styles/index.css` returns `1` (Tailwind v4 theme directive).
    - `grep -c "@import './tokens.css'" src/styles/index.css` returns `1`.
    - `grep -c 'env(safe-area-inset' src/styles/index.css` returns at least `2` (top + bottom insets).
    - `ls src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/sheet.tsx` — all three files exist.
    - `grep -c "classList.add('dark')" src/main.tsx` returns `1`.
    - `components.json` exists and `grep -c '"baseColor": "zinc"' components.json` returns `1`.
    - `npm run build` still exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && test -f src/components/ui/button.tsx && test -f src/components/ui/card.tsx && test -f src/components/ui/sheet.tsx && grep -q '#09090b' src/styles/tokens.css && grep -q '@theme' src/styles/index.css</automated>
  </verify>
  <done>Tokens declared with exact locked hex values including Phase-3 alpha-ramp tokens; Tailwind v4 @theme wires tokens to utility classes; shadcn/ui Button/Card/Sheet installed; dark class applied at startup; build passes.</done>
</task>

<task type="auto">
  <name>Task 3: Build AppShell, hash router, bottom tab bar, Today placeholder, Calendar + Settings stubs, Banner primitive</name>
  <files>
    src/App.tsx,
    src/components/AppShell.tsx,
    src/components/TabBar.tsx,
    src/components/Banner.tsx,
    src/routes/TodayScreen.tsx,
    src/routes/CalendarScreen.tsx,
    src/routes/SettingsScreen.tsx
  </files>
  <read_first>
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Layout & Component Contracts" (AppShell ASCII diagram, dimensions, colors, a11y requirements)
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Copywriting Contract" (EXACT Today/Calendar/Settings/Banner copy — must match verbatim)
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Accessibility" (focus ring, aria-label, aria-current, role=banner)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-01 through D-06)
    - .planning/phases/01-foundation/01-RESEARCH.md §6 (hash routing pattern)
    - src/components/ui/button.tsx, card.tsx, sheet.tsx (shadcn imports the shell will use)
  </read_first>
  <action>
    1. `src/App.tsx` — wrap `AppShell` in `HashRouter` (D-03). Define 3 routes inside it:
       ```tsx
       import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
       import { AppShell } from './components/AppShell';
       import { TodayScreen } from './routes/TodayScreen';
       import { CalendarScreen } from './routes/CalendarScreen';
       import { SettingsScreen } from './routes/SettingsScreen';

       export default function App() {
         return (
           <HashRouter>
             <AppShell>
               <Routes>
                 <Route path="/" element={<Navigate to="/today" replace />} />
                 <Route path="/today" element={<TodayScreen />} />
                 <Route path="/calendar" element={<CalendarScreen />} />
                 <Route path="/settings" element={<SettingsScreen />} />
               </Routes>
             </AppShell>
           </HashRouter>
         );
       }
       ```

    2. `src/components/AppShell.tsx` — top header + banner slot + outlet + bottom tab bar (per UI-SPEC.md §"AppShell" ASCII diagram). Structure:
       ```tsx
       import { Link } from 'react-router-dom';
       import { Settings as SettingsIcon } from 'lucide-react';
       import { TabBar } from './TabBar';

       export function AppShell({ children }: { children: React.ReactNode }) {
         return (
           <div className="flex flex-col min-h-dvh bg-bg text-text">
             <header
               className="safe-area-top sticky top-0 z-40 bg-surface border-b border-border"
             >
               <div className="h-14 flex items-center justify-between px-4">
                 <span className="text-xl font-semibold">HealthTracker</span>
                 <Link to="/settings" aria-label="Settings"
                   className="text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md p-2">
                   <SettingsIcon size={20} />
                 </Link>
               </div>
             </header>

             <main className="flex-1 overflow-y-auto">
               <div className="max-w-md mx-auto w-full">
                 {/* Plan 03 mounts Install + Eviction banners HERE (above route outlet, inside content column). */}
                 {/* Placeholder comment — Plan 03 inserts <InstallBanner /> and <EvictionBanner /> above {children}. */}
                 {children}
               </div>
             </main>

             <TabBar />
           </div>
         );
       }
       ```
       Note: Header height 56px (`h-14` = 3.5rem = 56px). The `<header>` element provides an implicit `role="banner"` landmark (no explicit attribute needed — avoids duplicate-landmark warnings when InstallBanner/EvictionBanner mount in Plan 03).

    3. `src/components/TabBar.tsx` — 3 tabs (Today/Calendar/Settings) with `NavLink`, accent color when active, Lucide icons per UI-SPEC.md §"Icons" table:
       ```tsx
       import { NavLink } from 'react-router-dom';
       import { Home, CalendarDays, Settings } from 'lucide-react';

       const tabs = [
         { to: '/today',    label: 'Today',    Icon: Home },
         { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
         { to: '/settings', label: 'Settings', Icon: Settings },
       ];

       export function TabBar() {
         return (
           <nav
             aria-label="Primary"
             className="safe-area-bottom sticky bottom-0 z-40 bg-surface border-t border-border"
           >
             <ul className="flex h-14">
               {tabs.map(({ to, label, Icon }) => (
                 <li key={to} className="flex-1">
                   <NavLink
                     to={to}
                     aria-label={label}
                     className={({ isActive }) =>
                       [
                         'flex flex-col items-center justify-center gap-1 h-full w-full',
                         'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                         isActive ? 'text-accent' : 'text-muted',
                       ].join(' ')
                     }
                   >
                     {({ isActive }) => (
                       <>
                         <Icon size={20} />
                         <span className="text-xs" aria-current={isActive ? 'page' : undefined}>{label}</span>
                       </>
                     )}
                   </NavLink>
                 </li>
               ))}
             </ul>
           </nav>
         );
       }
       ```

    4. `src/routes/TodayScreen.tsx` — EXACT D-05 copy, 4 stacked cards (use shadcn `<Card>`):
       ```tsx
       import { Card } from '@/components/ui/card';

       const sections = [
         { title: 'PT',    status: 'not logged yet' },
         { title: 'Food',  status: '0 / target cals' },
         { title: 'Steps', status: '—' },
         { title: 'Lift',  status: '☐' },
       ];

       export function TodayScreen() {
         return (
           <div className="px-4 py-6 space-y-4">
             {sections.map(({ title, status }) => (
               <Card key={title} className="bg-surface border border-border rounded-lg p-4">
                 <div className="flex items-baseline justify-between">
                   <h2 className="text-base font-semibold text-text">{title}</h2>
                   <span className="text-sm text-muted">{status}</span>
                 </div>
               </Card>
             ))}
           </div>
         );
       }
       ```
       CRITICAL: Copy strings `not logged yet`, `0 / target cals`, `—` (em-dash U+2014), `☐` (U+2610) MUST match UI-SPEC.md Copywriting Contract exactly. Phase 2 checker will grep for these.

    5. `src/routes/CalendarScreen.tsx` — stub per UI-SPEC.md Copywriting Contract:
       ```tsx
       export function CalendarScreen() {
         return (
           <div className="flex items-center justify-center min-h-full px-4 py-6">
             <p className="text-sm text-muted">Coming in Phase 3</p>
           </div>
         );
       }
       ```

    6. `src/routes/SettingsScreen.tsx` — minimal stub that renders a screen title; the Install card + version line are added by Plan 03 (UI-SPEC.md makes this split explicit):
       ```tsx
       export function SettingsScreen() {
         return (
           <div className="px-4 py-6 space-y-4">
             <h1 className="text-xl font-semibold">Settings</h1>
             {/* Plan 03 adds: Install card, Version line, Install handler wiring */}
           </div>
         );
       }
       ```

    7. `src/components/Banner.tsx` — reusable banner primitive built on Card (UI-SPEC.md §"Install banner" and §"Eviction banner" share this primitive). Plan 03 consumes the export. Signature must match the interface block at the top of this plan:
       ```tsx
       import { X } from 'lucide-react';
       import { Button } from '@/components/ui/button';
       import { Card } from '@/components/ui/card';
       import { cn } from '@/lib/utils';

       export interface BannerProps {
         title: string;
         body: string;
         variant?: 'default' | 'warning';
         primaryAction?: { label: string; onClick: () => void };
         onDismiss: () => void;
       }

       export function Banner({ title, body, variant = 'default', primaryAction, onDismiss }: BannerProps) {
         return (
           <Card
             role="region"
             aria-label="Safety notice"
             className={cn(
               'bg-surface border border-border rounded-lg p-4',
               variant === 'warning' && 'border-accent/40'
             )}
           >
             <div className="flex items-start justify-between gap-3">
               <div className="flex-1">
                 <h2 className="text-base font-semibold text-text">{title}</h2>
                 <p className="text-sm text-muted mt-1">{body}</p>
                 {primaryAction && (
                   <div className="mt-3">
                     <Button variant="default" onClick={primaryAction.onClick}>
                       {primaryAction.label}
                     </Button>
                   </div>
                 )}
               </div>
               <button
                 type="button"
                 aria-label="Dismiss"
                 onClick={onDismiss}
                 className="text-muted p-2 -m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
               >
                 <X size={20} />
               </button>
             </div>
           </Card>
         );
       }
       ```

    8. Run `npm run dev`, open `http://localhost:5173/#/today`, visually confirm (then close):
       - Dark background renders immediately (no light flash).
       - Top header shows "HealthTracker" + gear icon.
       - Bottom tab bar shows Home/Calendar/Settings icons; active tab is green.
       - 4 placeholder cards visible with exact copy.
       - `/#/calendar` shows "Coming in Phase 3"; `/#/settings` shows "Settings" heading.
  </action>
  <acceptance_criteria>
    - `grep -c 'HashRouter' src/App.tsx` returns `1`.
    - `grep -c 'PT — not logged yet' src/routes/TodayScreen.tsx` returns `0` (stored as separated fields).
    - `grep -c "'not logged yet'" src/routes/TodayScreen.tsx` returns `1`.
    - `grep -c "'0 / target cals'" src/routes/TodayScreen.tsx` returns `1`.
    - `grep -c "'—'" src/routes/TodayScreen.tsx` returns `1` (em-dash U+2014 — used for Steps status slot per D-05).
    - `grep -c "'☐'" src/routes/TodayScreen.tsx` returns `1` (empty checkbox U+2610 — used for Lift status slot per D-05).
    - `grep -c "'Coming in Phase 3'" src/routes/CalendarScreen.tsx` returns `1`.
    - `grep -c "'/today'" src/components/TabBar.tsx` returns `1`.
    - `grep -c "'/calendar'" src/components/TabBar.tsx` returns `1`.
    - `grep -c "'/settings'" src/components/TabBar.tsx` returns `1`.
    - `grep -c 'aria-label' src/components/TabBar.tsx` returns at least `1`.
    - `grep -c 'safe-area-top' src/components/AppShell.tsx` returns `1`.
    - `grep -c 'role="banner"' src/components/AppShell.tsx` returns `0` (implicit via `<header>` element; explicit attribute removed to prevent duplicate landmark warnings).
    - `grep -c 'safe-area-bottom' src/components/TabBar.tsx` returns `1`.
    - `grep -c 'role="region"' src/components/Banner.tsx` returns `1` (deviation from UI-SPEC: generic Banner uses `role="region"` + `aria-label` to avoid landmark overuse; Install/Eviction banners in Plan 01-03 apply their own specific landmarks).
    - `grep -c 'aria-label="Safety notice"' src/components/Banner.tsx` returns `1`.
    - `grep -c 'aria-label="Dismiss"' src/components/Banner.tsx` returns `1`.
    - `grep -c 'focus-visible:ring-accent' src/components/TabBar.tsx` returns `1` (a11y focus ring).
    - `npm run build` exits 0.
    - `npm run typecheck` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q "'not logged yet'" src/routes/TodayScreen.tsx && grep -q "'0 / target cals'" src/routes/TodayScreen.tsx && grep -q "'Coming in Phase 3'" src/routes/CalendarScreen.tsx && grep -q 'HashRouter' src/App.tsx</automated>
  </verify>
  <done>Running dev server shows dark shell with 3 hash-routed tabs, Today screen renders 4 placeholder cards with D-05 copy verbatim, Banner primitive exported for Plan 03 consumption, all a11y landmarks + focus rings present.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → build | Third-party dependencies enter the app via `package.json`; lockfile is the integrity anchor |
| Browser runtime → window/document | No cross-origin input; app is local-only; DOM is fully controlled |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | npm dependencies | mitigate | Pin major versions in package.json; commit package-lock.json; never run `npm install --force` |
| T-01-02 | Tampering | Vite 8 peer-dep warning from vite-plugin-pwa | mitigate | Pin vite to ^7 (NOT ^8) per CLAUDE.md; monitor vite-plugin-pwa 1.3 release |
| T-01-03 | Elevation of Privilege | Unsafe innerHTML in Banner/shell | accept | No `dangerouslySetInnerHTML` used; all user-provided strings in later phases sanitized by React's default escaping — no risk in Phase 1 (shell renders only static strings) |
| T-01-04 | Information Disclosure | Exposing version/build-hash | accept | Version + commit hash shown in Settings is intentional (D-10) and non-sensitive for a local-only solo-user app |
| T-01-05 | Denial of Service | Unbounded `dvh` layout thrash on iOS Safari | mitigate | Use `min-h-dvh` (not `min-h-screen` which lags during address-bar hide); verified flicker-free on iOS 17+ |
</threat_model>

<verification>
- `npm run typecheck` exits 0.
- `npm run build` exits 0 and produces `dist/` with `index.html` and JS bundle.
- `npm run dev` starts and serves the shell without runtime errors (manually verified in browser once per task 3).
- All locked copy strings present verbatim in TodayScreen / CalendarScreen.
- Dependency pins match STACK.md (Vite ^7, React ^19, Dexie ^4, Tailwind ^4, vite-plugin-pwa ^1).
</verification>

<success_criteria>
1. Running `npm run dev` serves a dark-themed SPA at localhost:5173 with header, bottom tabs, and Today cards visible.
2. Navigating to `/#/today`, `/#/calendar`, `/#/settings` switches content without page reload and updates tab-active state.
3. `npm run build` produces a production bundle that Plan 03 will extend with PWA + banner logic.
4. Plan 02 and Plan 03 can now start in parallel — both have a compiling TypeScript project to build on.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md` with:
- Final dependency versions installed (from `npm ls --depth=0`)
- Any deviations from the planned file list
- The exact strings used in TodayScreen/CalendarScreen/SettingsScreen (for Plan 03 to reference when extending Settings)
- shadcn components installed (confirm Button/Card/Sheet only)
- Any Tailwind v4 @theme syntax variations needed vs the RESEARCH.md skeleton (v4 is recent — syntax may have drifted)
</output>
