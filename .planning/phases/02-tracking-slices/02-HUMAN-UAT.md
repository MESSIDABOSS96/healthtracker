---
status: partial
phase: 02-tracking-slices
source: [02-VERIFICATION.md]
started: 2026-04-21T00:15:00Z
updated: 2026-04-21T00:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Fresh-profile first launch creates goals singleton with D-13 defaults
expected: DevTools → Application → IndexedDB → HealthTrackerDB → goals has one record id='singleton' with calories:2000, proteinG:180, carbsG:180, fatG:65, steps:8000
result: [pending]

### 2. End-to-end PT flow — create template, start session, save, see status
expected: Tap PT card → Sheet opens (no slide) → New template → enter name+exercises → Save → tap template card → Session form with exercise rows + Pain + Notes → Save session → Sheet closes → PT card status shows '{name} · X/Y ex'
result: [pending]

### 3. End-to-end Food flow — create food with photo, log it, see live macro bars update
expected: Tap Food card → Sheet opens → search for new food name → Create '...' → fill macros + photo → Save and log → Sheet closes → 4 macro ProgressBars on Today Food card fill; sticky MacroTotalsBar mirrors
result: [pending]

### 4. SET-02 cross-screen reactivity — Settings goal edit propagates to Today without reload
expected: Settings → change Calories to 2200 → Save goals → return to Today → Food card status `X / 2200 cal` + macro bar max reflects 2200 without a reload
result: [pending]

### 5. Steps inline-edit — tap status → number input → Enter commits
expected: Today → tap Steps status area → number input appears focused → type 6400 → Enter → input disappears → status shows '6400 / 8000' and ProgressBar fills ~80%
result: [pending]

### 6. LIFT-02 optional note after toggle on
expected: Today → tap ☐ glyph on Lift card → glyph swaps to ✓ in accent → Add note affordance appears → tap → type note → blur → note persists as tappable text; reload preserves
result: [pending]

### 7. PT previous-session hint (PT-07) appears on second session for same template
expected: After saving one session for a template with actualSets=3/actualReps=8 and painRating=2, re-opening the session form for that template shows 'Last: 3×8 · pain 2/5 · today' under the matching exercise row
result: [pending]

### 8. Recent + Frequent chip taps log with last-used servings (FOOD-04)
expected: After logging a food once with 1.5 servings, re-opening the Food Sheet and tapping its Recent chip pre-fills 1.5 servings into the new meal entry
result: [pending]

### 9. Optional description persists through create + edit (PT-01 full field set)
expected: Create a PT template with exercise description 'Dead hang, chin over bar' → Save → open Edit → description pre-fills → clear description → Save → reopen Edit → description is empty (undefined in stored record, not empty string)
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
