---
phase: 04-backup-polish
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/useDayKey.ts
  - src/features/calendar/hooks.ts
  - src/features/calendar/StreakCount.tsx
autonomous: true
requirements: [BACK-01, BACK-02]
tags: [streak, midnight, hook, polish]

must_haves:
  truths:
    - "A user sitting on a long-open Calendar tab across local midnight sees the streak count and today-quadrant-completion state refresh WITHOUT a page reload (closes WR-01 and WR-02 from Phase 3 review)"
    - "useDayKey() returns today's dayKey (via lib/dayKey.ts:todayKey) and triggers a React re-render when local midnight passes"
    - "The hook schedules exactly ONE setTimeout at a time per consumer; on each fire it re-schedules for the next local midnight (chained reschedule via [key] useEffect dep)"
    - "On component unmount, the active timer is cleared (no leaked timers across unmounts)"
    - "useCurrentStreakCount re-subscribes its useLiveQuery on midnight rollover (dep array includes today)"
    - "StreakCount no longer contains inline todayKey() / useLiveQuery — it consumes the new useTodayQuadrantState() hook"
    - "All dayKey construction in the new hook goes through lib/dayKey.ts (Pitfall #4 — never toISOString().split)"
  artifacts:
    - path: "src/lib/useDayKey.ts"
      provides: "Midnight-tick hook — reactive today's dayKey"
      exports: ["useDayKey"]
      min_lines: 25
    - path: "src/features/calendar/hooks.ts"
      provides: "Phase 3 hooks MODIFIED — useCurrentStreakCount uses useDayKey; new useTodayQuadrantState export"
      contains: "useTodayQuadrantState"
    - path: "src/features/calendar/StreakCount.tsx"
      provides: "Phase 3 component MODIFIED — consumes useCurrentStreakCount + useTodayQuadrantState; no inline useLiveQuery"
  key_links:
    - from: "src/features/calendar/hooks.ts:useCurrentStreakCount"
      to: "src/lib/useDayKey.ts:useDayKey"
      via: "const today = useDayKey(); useLiveQuery(..., [today])"
      pattern: "useDayKey\\(\\)"
    - from: "src/features/calendar/StreakCount.tsx"
      to: "src/features/calendar/hooks.ts:useTodayQuadrantState"
      via: "useTodayQuadrantState() replaces inline useLiveQuery"
      pattern: "useTodayQuadrantState"
    - from: "src/lib/useDayKey.ts"
      to: "src/lib/dayKey.ts:todayKey"
      via: "initial state + every tick re-computes todayKey()"
      pattern: "todayKey\\(\\)"
---

<objective>
Close WR-01 (streak count midnight staleness) and WR-02 (today-quadrant state midnight staleness) from the Phase 3 review per D-05. Today, a user who keeps the Calendar tab open across local midnight sees a stale streak count and a stale today-ring because the Phase 3 hooks use `[]` dep arrays and Phase 3's inline `todayKey()` inside `StreakCount.tsx` never re-evaluates.

Purpose: The 4-segment streak loop is the app's core motivator (PROJECT.md). A stale streak count silently undermines that loop. This plan adds a tiny reactive hook that makes "what day is it" a first-class reactive value — and wires it through the two Phase 3 consumers.
Output: One new lib-level hook file and two small edits to existing calendar feature files.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-backup-polish/04-CONTEXT.md
@.planning/phases/04-backup-polish/04-RESEARCH.md
@.planning/phases/04-backup-polish/04-PATTERNS.md
@.planning/research/PITFALLS.md
@CLAUDE.md

<!-- Source files this plan READS or extends -->
@src/lib/dayKey.ts
@src/features/calendar/hooks.ts
@src/features/calendar/StreakCount.tsx
@src/services/streak.svc.ts
@src/features/food/FoodThumb.tsx
@src/components/InstallBanner.tsx

<interfaces>
<!-- Contracts the executor needs -->

From src/lib/dayKey.ts:
```typescript
export function todayKey(): string;   // 'YYYY-MM-DD' local-tz
```

From src/services/streak.svc.ts (consumed by the new hook):
```typescript
export interface QuadrantState { pt: boolean; food: boolean; steps: boolean; lift: boolean; }
export async function getStreakDataForRange(
  startKey: string,
  endKey: string,
): Promise<Map<string, QuadrantState>>;
export async function getCurrentStreakCount(): Promise<number>;
```

From src/features/calendar/hooks.ts (the CURRENT shape — you modify):
```typescript
export function useCurrentStreakCount(): number | undefined {
  return useLiveQuery(() => getCurrentStreakCount(), []);   // <-- dep changes to [today]
}
// existing: useMonthStreakData, useEarliestDayKey, useDayDetail (do NOT modify these)
```

From src/features/calendar/StreakCount.tsx (the CURRENT shape — you modify):
```typescript
// Currently imports useLiveQuery, getStreakDataForRange, todayKey
// Uses them inline to compute todaysRow + today + todayState
// After edit: consume useTodayQuadrantState() from './hooks'; drop the 3 now-unused imports
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/lib/useDayKey.ts</name>
  <files>
    - src/lib/useDayKey.ts (NEW)
  </files>
  <read_first>
    - src/lib/dayKey.ts (verify todayKey() + dateToKey signatures — never construct dayKey via toISOString)
    - src/features/food/FoodThumb.tsx (structural analog — useEffect with cleanup; lines 21-46)
    - src/components/InstallBanner.tsx (cleanup-on-unmount analog; lines 45-49)
    - .planning/phases/04-backup-polish/04-RESEARCH.md Pattern 4 (verbatim source for useDayKey body; includes DST note + background-tab note)
    - .planning/phases/04-backup-polish/04-RESEARCH.md §Pitfall 3 (stale `key` closure — dep array MUST be [key], not [])
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"src/lib/useDayKey.ts" for analog mapping
    - .planning/research/PITFALLS.md §Pitfall 4 (why this file MUST go through lib/dayKey.ts)
  </read_first>
  <behavior>
    - Initial render: `useDayKey()` returns the current local dayKey — equal to `todayKey()` at render time
    - Hook schedules a `setTimeout` for `msUntilMidnight()` ms from now; on fire it calls `setKey(todayKey())` which triggers a React re-render AND causes the effect to re-run, scheduling the NEXT midnight
    - Effect dep is `[key]` (NOT `[]`) — this is the whole trick; `[]` would freeze the first schedule and never re-schedule
    - `msUntilMidnight()` returns ms until TOMORROW at 00:00:05 local (5 second grace past midnight so we don't race the clock)
    - `msUntilMidnight()` uses `new Date()` + `next.setHours(24, 0, 5, 0)` — JS Date handles DST transitions correctly when you set hours on a local-tz Date
    - On unmount, `clearTimeout(timer)` fires via the effect's cleanup — no leaked timers
    - Hook DOES NOT call `new Date().toISOString().split('T')[0]` (Pitfall #4) — delegates to `todayKey()`
    - Two consumers mounting the hook concurrently each get their own timer (consumer isolation — no shared singleton); this is fine at our scale (at most 2-3 simultaneous consumers)
  </behavior>
  <action>
Create NEW file `src/lib/useDayKey.ts` with exactly this content. The msUntilMidnight() helper uses `setHours(24, 0, 5, 0)` specifically — changing to `setDate + setHours` breaks DST edge cases. Do not alter the dep array from `[key]`.

```typescript
// src/lib/useDayKey.ts
// Reactive today's dayKey — re-renders consumers when local midnight passes.
// Closes Phase 3 review items WR-01 (streak count staleness) and WR-02
// (today-quadrant state staleness) per Phase 4 D-05.
//
// Pitfall #4 (CLAUDE.md rule #3): NEVER construct dayKey via
// `new Date().toISOString().split('T')[0]` — that returns UTC date and shifts
// days for western timezones at night. Delegates to lib/dayKey.ts:todayKey().
//
// RESEARCH Pattern 4 + §Pitfall 3: dep array is [key], NOT []. Each tick
// triggers a fresh effect run which computes msUntilMidnight() from the NEW
// "now" and schedules the NEXT midnight. Using [] would freeze the schedule
// to the first mount.
//
// DST: next.setHours(24, 0, 5, 0) on a local-tz Date correctly accounts for
// DST transitions (JS Date does the tz-aware arithmetic when setting hours).
//
// Background-tab throttling: mobile Safari throttles setTimeout to ~1s minimum
// when backgrounded. On tab foreground, any pending late fire runs a few
// seconds after foregrounding, which is fine — user doesn't see stale state.
//
// Consumer scale: expected 2-3 simultaneous consumers (StreakCount +
// useCurrentStreakCount + useTodayQuadrantState). No shared singleton needed.

import { useEffect, useState } from 'react';
import { todayKey } from '@/lib/dayKey';

function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 5, 0); // tomorrow 00:00:05 local — 5s grace past midnight
  return next.getTime() - now.getTime();
}

export function useDayKey(): string {
  const [key, setKey] = useState<string>(() => todayKey());

  useEffect(() => {
    const timer = setTimeout(() => {
      setKey(todayKey());
    }, msUntilMidnight());
    return () => clearTimeout(timer);
  }, [key]);

  return key;
}
```
  </action>
  <verify>
    <automated>
      test -f src/lib/useDayKey.ts \
      && grep -q "export function useDayKey" src/lib/useDayKey.ts \
      && grep -q "import { todayKey } from '@/lib/dayKey'" src/lib/useDayKey.ts \
      && grep -q "setTimeout(" src/lib/useDayKey.ts \
      && grep -q "clearTimeout(" src/lib/useDayKey.ts \
      && grep -q "msUntilMidnight" src/lib/useDayKey.ts \
      && grep -q "next.setHours(24, 0, 5, 0)" src/lib/useDayKey.ts \
      && grep -qE "\\}, \\[key\\]\\);?" src/lib/useDayKey.ts \
      && ! grep -qE "toISOString\\(\\)\\.split" src/lib/useDayKey.ts \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/useDayKey.ts` exists
    - File exports `useDayKey` as a named function (`export function useDayKey`)
    - File imports `todayKey` from `@/lib/dayKey` (not re-implements it)
    - File contains `setTimeout(` and `clearTimeout(` (timer set + cleanup)
    - File contains a helper named `msUntilMidnight`
    - File contains the EXACT string `next.setHours(24, 0, 5, 0)` (5-second grace past midnight per RESEARCH Pattern 4)
    - File's useEffect dep array is `[key]` — verified by regex match `}, [key])` (NOT `}, [])`)
    - File does NOT contain `toISOString().split` (Pitfall #4)
    - File does NOT use `setInterval` (RESEARCH "Don't Hand-Roll" — setInterval wakes main thread 1440×/day for one transition)
    - `npm run build` exits 0 with no TypeScript errors
  </acceptance_criteria>
  <done>
    useDayKey hook exports a reactive dayKey that re-renders on each local midnight. Compiles cleanly. Pitfall guards in place.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire useDayKey through calendar hooks + StreakCount</name>
  <files>
    - src/features/calendar/hooks.ts (MODIFIED — 2 small changes: add useDayKey dep to useCurrentStreakCount; add new useTodayQuadrantState export)
    - src/features/calendar/StreakCount.tsx (MODIFIED — replace inline useLiveQuery/todayKey with useTodayQuadrantState)
  </files>
  <read_first>
    - src/lib/useDayKey.ts (the hook created in Task 1 — confirm signature)
    - src/features/calendar/hooks.ts (current file — confirm lines 57-60 for useCurrentStreakCount, lines 20-32 for imports; pattern to match `useMonthStreakData` lines 48-55)
    - src/features/calendar/StreakCount.tsx (current file — confirm lines 8-27 inline subscription pattern to replace)
    - src/services/streak.svc.ts (confirm getStreakDataForRange + QuadrantState exports)
    - .planning/phases/04-backup-polish/04-RESEARCH.md Pattern 4 wiring section (verbatim diff for both files)
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"src/features/calendar/hooks.ts" and §"src/features/calendar/StreakCount.tsx" (surgical-change guidance)
  </read_first>
  <behavior>
    - After edit, `useCurrentStreakCount()` resubscribes its useLiveQuery when midnight rolls over (dep = [today] where today comes from useDayKey)
    - After edit, `useTodayQuadrantState()` is a new named export from `src/features/calendar/hooks.ts` that returns `QuadrantState | undefined`
    - StreakCount no longer imports `useLiveQuery` or `getStreakDataForRange` or `todayKey` from their originals — instead imports `useCurrentStreakCount` AND `useTodayQuadrantState` from `./hooks`
    - StreakCount's rendering logic is unchanged (same subtitle rules, same aria-label, same markup) — only the source of `todayState` changes from inline `useLiveQuery` to the new hook
    - `useMonthStreakData`, `useEarliestDayKey`, and `useDayDetail` are UNTOUCHED (their dep arrays are correct already; changing them would be scope creep rejected by D-08)
  </behavior>
  <action>
STEP 1 — Modify `src/features/calendar/hooks.ts`:

(a) Add a new import at the top (alongside the existing `useLiveQuery` import group):

```typescript
import { useDayKey } from '@/lib/useDayKey';
```

(b) Update `useCurrentStreakCount` (currently lines 57-60). Replace:

```typescript
/** Reactive streak count. Undefined on first paint; caller coalesces to 0. */
export function useCurrentStreakCount(): number | undefined {
  return useLiveQuery(() => getCurrentStreakCount(), []);
}
```

With:

```typescript
/** Reactive streak count. Undefined on first paint; caller coalesces to 0.
 *  useDayKey() threads through so midnight rollover re-subscribes the live
 *  query — closes Phase 3 WR-01 per Phase 4 D-05. */
export function useCurrentStreakCount(): number | undefined {
  const today = useDayKey();
  return useLiveQuery(() => getCurrentStreakCount(), [today]);
}
```

(c) Add a NEW hook export `useTodayQuadrantState` immediately after `useEarliestDayKey` (between the existing MONTH-GRID section and the "Day Detail composite" section). Use this exact content:

```typescript
/** Reactive today's 4-quadrant completion state. Powers StreakCount's
 *  "finish today's 4th" subtitle. One range query on a single day is O(1) —
 *  NOT Anti-Pattern 3 (per the existing StreakCount.tsx:17 comment). Closes
 *  Phase 3 WR-02 per Phase 4 D-05. */
export function useTodayQuadrantState(): QuadrantState | undefined {
  const today = useDayKey();
  const row = useLiveQuery(
    () => getStreakDataForRange(today, today),
    [today],
  );
  return row?.get(today);
}
```

(Make sure `QuadrantState` and `getStreakDataForRange` are available — they ARE already imported at the top of the current file per lines 21-26, so no additional imports are needed beyond `useDayKey` added in step (a).)

STEP 2 — Modify `src/features/calendar/StreakCount.tsx`. Replace the current file body (keeping the file-header comment and the export) with the simplified version that consumes the new hook. Final file content:

```tsx
// src/features/calendar/StreakCount.tsx
// Hero streak-count block above the month grid. Positive-framed copy per
// UI-SPEC §Streak count component (lines 186-198): today never shown as
// "broken" — if today isn't 4/4 yet, subtitle is "finish today's 4th to
// extend" (forward-looking, anti-Pitfall #6). Instant text swap on change
// (no count-up animation, per anti-motion policy).
//
// Phase 4 D-05: today's quadrant state comes from useTodayQuadrantState()
// (which internally uses useDayKey() for midnight-rollover reactivity).
// Closes Phase 3 WR-02 — no more stale 4/4 check after local midnight.

import { useCurrentStreakCount, useTodayQuadrantState } from './hooks';

export function StreakCount() {
  const count = useCurrentStreakCount() ?? 0;
  const todayState = useTodayQuadrantState();
  const todayIsComplete =
    !!todayState && todayState.pt && todayState.food && todayState.steps && todayState.lift;

  const suffix = count === 1 ? 'day' : 'days';

  let subtitle: string | null = null;
  if (count === 0) {
    subtitle = 'log all 4 areas today to start a streak';
  } else if (!todayIsComplete) {
    subtitle = "finish today's 4th to extend";
  }
  // else: today IS complete and the streak includes today — no subtitle needed.

  const ariaLabel = `Streak: ${count} ${suffix}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="pt-6 pb-4 flex flex-col items-center"
    >
      <span className="text-xl font-semibold text-text tabular-nums">{count}</span>
      <span className="text-sm text-muted">{suffix}</span>
      {subtitle && (
        <span className="text-xs text-muted mt-1">{subtitle}</span>
      )}
    </div>
  );
}
```

Note: the 3 imports previously in this file (`useLiveQuery`, `getStreakDataForRange`, `todayKey`) are REMOVED because they are no longer used — the new hook does all that work internally. Import list reduces to one: `{ useCurrentStreakCount, useTodayQuadrantState }` from `./hooks`.
  </action>
  <verify>
    <automated>
      grep -q "import { useDayKey } from '@/lib/useDayKey'" src/features/calendar/hooks.ts \
      && grep -q "export function useTodayQuadrantState" src/features/calendar/hooks.ts \
      && grep -q "const today = useDayKey()" src/features/calendar/hooks.ts \
      && grep -qE "useLiveQuery\\(\\(\\) => getCurrentStreakCount\\(\\), \\[today\\]\\)" src/features/calendar/hooks.ts \
      && grep -q "useTodayQuadrantState" src/features/calendar/StreakCount.tsx \
      && ! grep -q "useLiveQuery" src/features/calendar/StreakCount.tsx \
      && ! grep -q "getStreakDataForRange" src/features/calendar/StreakCount.tsx \
      && ! grep -q "import.*todayKey.*from '@/lib/dayKey'" src/features/calendar/StreakCount.tsx \
      && grep -q "useCurrentStreakCount" src/features/calendar/StreakCount.tsx \
      && ! grep -qE "toISOString\\(\\)\\.split" src/features/calendar/hooks.ts \
      && ! grep -qE "toISOString\\(\\)\\.split" src/features/calendar/StreakCount.tsx \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/features/calendar/hooks.ts` contains `import { useDayKey } from '@/lib/useDayKey';`
    - File contains `export function useTodayQuadrantState` (new named export)
    - `useCurrentStreakCount` body contains `const today = useDayKey()` AND the useLiveQuery dep array is `[today]` (NOT `[]`) — regex match `useLiveQuery\(\(\) => getCurrentStreakCount\(\), \[today\]\)`
    - `useTodayQuadrantState` body contains `getStreakDataForRange(today, today)` and `row?.get(today)`
    - `useMonthStreakData`, `useEarliestDayKey`, and `useDayDetail` still exist in the file (not accidentally deleted)
    - File `src/features/calendar/StreakCount.tsx` contains `useTodayQuadrantState` (consumer)
    - File contains `useCurrentStreakCount` (consumer)
    - File does NOT contain `useLiveQuery` (removed — handled inside the hook now)
    - File does NOT contain `getStreakDataForRange` (removed)
    - File does NOT contain `import.*todayKey.*from '@/lib/dayKey'` (removed)
    - File still contains the aria-label markup (`role="status"`, `aria-live="polite"`, `aria-label={ariaLabel}`)
    - File still contains the subtitle logic (`"log all 4 areas today to start a streak"`, `"finish today's 4th to extend"`)
    - Neither modified file contains `toISOString().split` (Pitfall #4 never introduced)
    - `npm run build` exits 0 with no TypeScript errors
  </acceptance_criteria>
  <done>
    useCurrentStreakCount + useTodayQuadrantState are both midnight-reactive via useDayKey. StreakCount consumes the hooks directly — no inline useLiveQuery or inline todayKey(). WR-01 + WR-02 closed. Build passes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| None applicable | This plan is purely a client-side React hook + two consumer rewires. No new input surface, no network, no storage. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-08 | Denial of Service | Timer leak across many unmounts drains battery | mitigate | `clearTimeout` cleanup in the useEffect return — verified by grep. One timer max per consumer instance. |
| T-04-09 | Information Disclosure | dayKey leaks through cross-origin window? | accept | `todayKey()` is local-only, never leaves the tab. No threat. |

**ASVS L1 applicable controls:** None — declarative UI reactivity change only.
</threat_model>

<verification>
1. `npm run build` exits 0 with no TypeScript errors
2. Grep confirms:
   - `src/lib/useDayKey.ts` exists with `[key]` dep, `setHours(24, 0, 5, 0)`, `clearTimeout`
   - `src/features/calendar/hooks.ts` contains `useTodayQuadrantState` export + `useDayKey` import
   - `src/features/calendar/StreakCount.tsx` is simplified (no inline useLiveQuery)
3. Manual sanity (Phase-end UAT, NOT this plan's gate):
   - Navigate to /#/calendar
   - Observe streak count renders correctly
   - (Midnight rollover verification requires waiting until tomorrow or system-clock manipulation — out of scope for this gate; the grep + build gates are the primary signal)
</verification>

<success_criteria>
**D-05 closed:** `useDayKey` hook exists in `src/lib/`, delegates to `lib/dayKey.ts:todayKey` (Pitfall #4 guard), uses chained setTimeout with `[key]` dep (Pitfall #3 guard), and is wired through `useCurrentStreakCount` + the new `useTodayQuadrantState`. StreakCount no longer has an inline useLiveQuery. WR-01 + WR-02 architecturally closed.

**No scope creep:** `useMonthStreakData`, `useEarliestDayKey`, `useDayDetail` are UNTOUCHED — the midnight fix is scoped surgically to the two hooks that matter. Per D-08 hard ceiling.
</success_criteria>

<output>
After completion, create `.planning/phases/04-backup-polish/04-02-SUMMARY.md` using `$HOME/.claude/get-shit-done/templates/summary.md`. Capture:
- Decisions: D-05 closed; open Q #3 resolved (lib-level placement)
- Patterns established: "midnight-tick hook pattern (setTimeout chained reschedule via [key] dep)"
- Affects: `src/lib/`, `src/features/calendar/`
- Provides: `useDayKey`, `useTodayQuadrantState`
</output>
