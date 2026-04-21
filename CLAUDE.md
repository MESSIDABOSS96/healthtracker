# HealthTracker

A fully-local, offline-first PWA for unified daily tracking of PT rehab, food/macros, steps, and a lift check-in — with a 4-segment calendar streak loop as the core motivator. Solo user, single device, no backend, no auth.

## Where to Look First

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Core value, requirements, constraints, key decisions. Always current. |
| `.planning/REQUIREMENTS.md` | v1 / v2 / out-of-scope with REQ-IDs. Traceability table maps REQ-IDs to phases. |
| `.planning/ROADMAP.md` | Phase structure with goals and success criteria. |
| `.planning/STATE.md` | Current project memory — what's in progress, decisions to resolve. |
| `.planning/research/SUMMARY.md` | Stack + build-order recommendations (read first). |
| `.planning/research/STACK.md` | Full technology choices with versions and rationale. |
| `.planning/research/ARCHITECTURE.md` | Object store schema, day-key rules, OPFS photo pattern, SW strategy. |
| `.planning/research/FEATURES.md` | Table-stakes / differentiators / anti-features. |
| `.planning/research/PITFALLS.md` | Project-breaking pitfalls to prevent from Phase 1. |
| `.planning/config.json` | Workflow preferences (mode, granularity, parallelism, agents). |

## Core Value (Non-Negotiable)

Visual consistency feedback that makes logging feel like a win. If the streak loop reliably motivates daily logging and everything else is imperfect, the product is succeeding. Every UX tradeoff biases toward **low-friction entry** and **satisfying visual feedback**.

## Stack (Locked by Research)

React 19 + Vite 7 + TypeScript + Dexie 4 (+ `useLiveQuery`) + Tailwind CSS 4 + shadcn/ui + `react-activity-calendar` + Recharts + React Hook Form + Zod + Zustand (ephemeral UI only).

**Pin Vite to 7.x** until `vite-plugin-pwa` 1.3 resolves Vite 8 peer-dep warnings.

## Project-Breaking Rules (From PITFALLS.md)

1. **Never `await` a non-IDB promise inside a Dexie transaction** — it silently auto-commits and drops writes.
2. **Never edit a past `db.version(N).stores({...})` declaration** — schema migrations are append-only. Add a new version block.
3. **Never use `toISOString().split('T')[0]`** to derive a day key — it returns UTC date and shifts days for western timezones. Use `lib/dayKey.ts` only.
4. **Call `navigator.storage.persist()` on startup** — without it, iOS Safari wipes IndexedDB after 7 days of inactivity.
5. **Resize photos to ≤800×800 @ 80% WebP before OPFS write** — raw iPhone photos fill quota and crash the tab.
6. **Photos live in OPFS, not as Dexie blobs** — `foods.photoKey` stores only a filename reference.

## GSD Workflow (Active)

This project is managed with the GSD workflow (`.claude/skills/gsd-*`). Active config:

- **Mode:** YOLO (auto-approve gates, execute fast)
- **Granularity:** Coarse (4 phases, 1–3 plans each)
- **Parallelism:** On (independent plans run concurrently)
- **Research / Plan Check / Verifier:** All enabled
- **Model profile:** Balanced (Sonnet across agents)

**Next step after initialization:** `/gsd-discuss-phase 1` to gather phase context, then `/gsd-plan-phase 1`.

## Phase Summary

| # | Phase | Requirements | Core Deliverable |
|---|-------|--------------|------------------|
| 1 | Foundation | SETUP + DATA (10) | Scaffold, Dexie schema, dayKey, OPFS, PWA shell, dark theme |
| 2 | Tracking Slices | PT + FOOD + STEPS + LIFT + SET (22) | All four logging areas + goals settings |
| 3 | Streak Loop | STREAK (7) | 4-segment calendar, day detail, streak count |
| 4 | Backup & Polish | BACK (2) | JSON export, PWA install polish |

## Open Decisions (Pre-Phase-3)

1. **Segment completion definition** — STREAK-02 currently says "any log fills quadrant"; research suggested "hit target" for food specifically. Lock before Phase 3 planning.
2. **DayCell SVG geometry / color palette** — design decision for the 4-segment indicator across 0/1/2/3/4 states. Lock during Phase 3 UI work.

## Explicitly Out of Scope

Full lift tracking, auth, cloud sync, Apple Health / Google Fit, barcode, nutrition APIs, social, notifications, streak freeze / gamification, hydration/sleep/mood, bodyweight. See REQUIREMENTS.md "Out of Scope" table for full reasoning.
