---
status: partial
phase: 03-streak-loop
source: [03-VERIFICATION.md]
started: 2026-04-21T19:55:00Z
updated: 2026-04-21T19:55:00Z
note: "User pre-approved the consolidated browser UAT at the Wave 2 checkpoint (covers 7/8 of these items). Test 7 (Today-tab regression) was not explicitly walked through but is structurally guaranteed by optional-prop defaults + tsc -b passing. Items remain partial until /gsd-verify-work 3 walks each formally."
---

## Current Test

[awaiting formal walkthrough — pre-approved via Wave 2 checkpoint]

## Tests

### 1. Calendar month grid — partial-fill visual distinction
expected: Days with 1/4, 2/4, 3/4 logged render each filled quadrant at --accent-25/50/75 alpha respectively; 4/4 days render solid --accent-100; 0/4 days render identically to never-logged. No red anywhere.
result: pre-approved (Wave 2 checkpoint, UAT row 6)

### 2. Today-cell 1px accent outline + 4/4 collision
expected: Today's cell has a 1px --accent outline outside the 2×2 grid; when today is 4/4 the outline overlays the solid fill without visible conflict.
result: pre-approved (Wave 2 checkpoint, UAT row 5)

### 3. Live reactivity — Today log updates Calendar quadrant fill
expected: Toggle Lift on Today → switch to Calendar → today's SE quadrant filled at the correct alpha within < 1s.
result: pre-approved (Wave 2 checkpoint, UAT row 6)

### 4. Prev/next month navigation + clamp behavior
expected: Prev chevron disabled at month of earliest dayKey (or today if empty); next chevron disabled at current month. Click works.
result: pre-approved (Wave 2 checkpoint, UAT row 2)

### 5. DayCell tap → /#/day/:dayKey renders DayDetail with 4 section cards
expected: Tap current-month cell → URL becomes /#/day/YYYY-MM-DD → Day Detail renders header + summary row + 4 section cards (PT, Food, Steps, Lift).
result: pre-approved (Wave 2 checkpoint, UAT row 8)

### 6. Past-day edit/delete wiring — writes to correct dayKey
expected: On past day: Steps edit / Lift toggle / Lift note edit / PT tap-to-edit all persist to the past dayKey. PT save preserves id+dayKey+loggedAt (no duplicate on today). Delete buttons remove correct records.
result: pre-approved (Wave 2 checkpoint, UAT rows 9-10)

### 7. Today tab regression check (Phase 2 default-prop backward compatibility)
expected: After Phase 3, Today tab's Steps/Lift/PT cards work exactly as before — leaf components omit dayKey prop → defaults to todayKey; PTSection omits editSession → list mode.
result: pending (not explicitly walked through; structurally guaranteed by tsc -b passing on unchanged Today callers)

### 8. Invalid dayKey URL redirect
expected: /#/day/not-a-date silently redirects to /#/calendar (no error). /#/day/2020-01-01 with no logs renders empty-state sections.
result: pre-approved (Wave 2 checkpoint, UAT row 11)

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

(none — items pre-approved via Wave 2 checkpoint pending formal walkthrough)
