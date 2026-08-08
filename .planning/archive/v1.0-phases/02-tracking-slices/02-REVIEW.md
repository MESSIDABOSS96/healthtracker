---
phase: 02-tracking-slices
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 42
files_reviewed_list:
  - package.json
  - package-lock.json
  - src/components/ProgressBar.tsx
  - src/components/ui/sheet.tsx
  - src/features/food/FoodCreateForm.tsx
  - src/features/food/FoodPicker.tsx
  - src/features/food/FoodSection.tsx
  - src/features/food/FoodSheet.tsx
  - src/features/food/FoodThumb.tsx
  - src/features/food/hooks.ts
  - src/features/food/MacroTotalsBar.tsx
  - src/features/food/MealEntryRow.tsx
  - src/features/food/QuickLogChip.tsx
  - src/features/food/QuickLogChipRow.tsx
  - src/features/food/TodayMealList.tsx
  - src/features/lifts/hooks.ts
  - src/features/lifts/LiftNoteInput.tsx
  - src/features/lifts/LiftSection.tsx
  - src/features/lifts/LiftToggle.tsx
  - src/features/pt/hooks.ts
  - src/features/pt/PainRating.tsx
  - src/features/pt/PTExerciseRow.tsx
  - src/features/pt/PTSection.tsx
  - src/features/pt/PTSessionForm.tsx
  - src/features/pt/PTSheet.tsx
  - src/features/pt/PTTemplateEditor.tsx
  - src/features/pt/PTTemplateList.tsx
  - src/features/settings/GoalsForm.tsx
  - src/features/settings/hooks.ts
  - src/features/steps/hooks.ts
  - src/features/steps/StepsInlineInput.tsx
  - src/features/steps/StepsSection.tsx
  - src/lib/dayKey.ts
  - src/main.tsx
  - src/routes/SettingsScreen.tsx
  - src/routes/TodayScreen.tsx
  - src/services/food.svc.ts
  - src/services/goals.svc.ts
  - src/services/lifts.svc.ts
  - src/services/meals.svc.ts
  - src/services/pt.svc.ts
  - src/services/steps.svc.ts
findings:
  critical: 0
  warning: 6
  info: 8
  total: 14
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 42
**Status:** issues_found

## Summary

Phase 2 tracking slices are in strong shape. The project-breaking pitfalls (Dexie txn/non-IDB awaits, dayKey timezone correctness, OPFS blob-vs-key separation, photo resize-before-write) are respected everywhere: no `await` fetch/OPFS inside a `db.transaction` block was found; `toISOString().split('T')[0]` is absent; `dayKey` is produced only by `lib/dayKey.ts`; photos are routed through `resizePhoto → savePhoto → photoKey` with the OPFS pipeline running outside any Dexie transaction. `persist()` is wired in `main.tsx:initApp()`.

Findings are concentrated around:
1. Input-commit race conditions on the two inline-edit controls (Steps + Lift note) where Escape-to-cancel can be overwritten by a trailing `onBlur` fired during unmount.
2. An `img` with `alt=""` used as a logical food identifier in QuickLogChip (accessible label is on the button wrapper, but the image still carries photo semantics).
3. A resource leak in `resizePhoto` (`createImageBitmap` result is never `.close()`'d).
4. Orphan-data risks when a Food is deleted while its `mealEntries` still reference it (cascade is not performed; the `TodayMealList` falls back to em-dash).
5. Minor type-safety escape hatches and code duplication between `MacroTotalsBar` and `ProgressBar`.

No Critical findings. No security issues (zero-trust boundary: all input is the single local user's own typing; no XSS vectors, no network surface, no `dangerouslySetInnerHTML`, no `eval`). `crypto.randomUUID()` is used for IDs; hardcoded-secret scan returned clean.

## Warnings

### WR-01: Escape-to-revert may be overwritten by `onBlur` commit on unmount

**File:** `src/features/steps/StepsInlineInput.tsx:51-59`
**Issue:** On `Escape`, the component calls `setValue(String(currentCount || ''))` then `onCommitted()`. `onCommitted` causes the parent (`StepsSection`) to set `editing=false`, unmounting the input. React state updates from `setValue` in the same keydown handler are batched and may not flush before unmount. Depending on browser and React version, an unmount of a focused `<input>` can fire `onBlur` synchronously, invoking `commit()` which reads `value` from the last rendered closure. If that closure still holds the user's typed (pre-Escape) value, Escape silently commits instead of reverting — the opposite of what the handler promises. This was also flagged implicitly by the inline comment "Enter blurs (which triggers commit via onBlur, avoiding double-fire)" — Escape has no such guard.
**Fix:** Gate the blur handler with a ref so Escape suppresses the commit:
```tsx
const skipCommitRef = useRef(false);

const commit = async () => {
  if (skipCommitRef.current) return; // Escape set this; skip write
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 999_999) {
    await upsertSteps(todayKey(), Math.floor(parsed));
  }
  onCommitted();
};

// onKeyDown Escape branch:
if (e.key === 'Escape') {
  skipCommitRef.current = true;
  setValue(String(currentCount || ''));
  onCommitted();
}
```

### WR-02: Same Escape-vs-blur race in `LiftNoteInput`

**File:** `src/features/lifts/LiftNoteInput.tsx:44-47`
**Issue:** Identical shape to WR-01. `Escape` sets `value` back to `currentNote` and fires `onCommitted()`. If `onBlur` fires during the resulting unmount, `commit()` persists `value.trim()` — but `value` in the trailing blur's closure still reflects the user's typed (pre-revert) text, so the trimmed draft overwrites the previous note. Discovery is easy: type new note, hit Escape, re-open the note field.
**Fix:** Introduce a `skipCommitRef` just like WR-01:
```tsx
const skipCommitRef = useRef(false);
const commit = async () => {
  if (skipCommitRef.current) return;
  await setLiftNote(todayKey(), value.trim());
  onCommitted();
};
// Escape branch:
if (e.key === 'Escape') {
  skipCommitRef.current = true;
  setValue(currentNote);
  onCommitted();
}
```

### WR-03: `ImageBitmap` created by `resizePhoto` is never closed — GPU/memory leak across photo additions

**File:** `src/lib/photoStore.ts:56-66`
**Issue:** `createImageBitmap` allocates a decoded bitmap that lives outside JS GC (it's backed by platform graphics memory). The canonical cleanup is `bitmap.close()` once the draw completes. Without it, each food-create with a photo leaks one decoded bitmap. Because each iPhone capture is ~4–5 MB raw → decoded several × larger, a handful of food additions can blow past iOS Safari's per-tab bitmap budget and start failing subsequent `createImageBitmap` calls. This is the exact "quota/crash" family of failures CLAUDE.md rule #5 targets.
**Fix:**
```ts
const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
try {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  // ... canvas draw ...
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(/* ... */);
  });
} finally {
  bitmap.close();
}
```

### WR-04: `deleteFood` does not cascade to `mealEntries` — orphan rows survive in history

**File:** `src/services/food.svc.ts:47-58`
**Issue:** When a Food is deleted, its `photoKey` is removed from OPFS and the Food row is removed — but every `MealEntry` with `foodId === food.id` remains in `mealEntries`. The UI degrades gracefully on the Today screen (`TodayMealList` renders `—` for a missing food), and the denormalized `computed*` fields keep the daily totals correct, but historical day views (introduced in Phase 3's streak loop) will render `— · 1× ` rows. Per D-20 the foodId is explicitly immutable on a MealEntry, so there's no safe path to rebind. Either cascade-delete the entries or decide and document that history retention is intentional.
**Fix:** Add a best-effort cleanup alongside the photo delete, then delete the Food. These are three separate single-statement operations; no multi-store transaction is needed (and introducing one would conflict with Pitfall #1 because `deletePhoto` is non-IDB):
```ts
export async function deleteFood(id: string): Promise<void> {
  const food = await db.foods.get(id);
  if (!food) return;
  if (food.photoKey) {
    try { await deletePhoto(food.photoKey); }
    catch (err) { console.error('[food.svc] photo delete failed', err); }
  }
  // NEW: cascade delete of referencing meal entries.
  const orphans = await db.mealEntries.where('foodId').equals(id).primaryKeys();
  if (orphans.length > 0) await db.mealEntries.bulkDelete(orphans);
  await db.foods.delete(id);
}
```
If the product decision is to KEEP historical entries (reasonable for streak-loop calendar), replace this fix with a JSDoc note on `deleteFood` explaining the orphan policy so the Phase 3 calendar code knows what to expect.

### WR-05: `FoodCreateForm` swallows `logMeal`/`createFood` rejections silently; orphan Food possible

**File:** `src/features/food/FoodCreateForm.tsx:65-86`
**Issue:** `onSubmit` awaits `createFood` then `logMeal`. If `logMeal` rejects (e.g., IndexedDB write fails mid-session), a Food row was already put but no MealEntry was written, and `onSaved()` is never called so the Sheet stays open with no feedback — the user sees a silent failure and may retap Save, producing a duplicate Food. Also, React Hook Form's `handleSubmit(async ...)` lets unhandled rejections surface as `formState.isSubmitting` hanging at true; the component doesn't read that so there's no visible signal.
**Fix:** Wrap in try/catch and surface at least a minimal state so the user knows to retry. Follow the silent-fallback pattern already used for photo saves:
```tsx
const onSubmit = handleSubmit(async (data) => {
  try {
    const food = await createFood({ /* ... */ });
    await logMeal({ food, servings: 1, bucket: inferBucket(), dayKey: todayKey() });
    onSaved();
  } catch (err) {
    console.error('[FoodCreateForm] save-and-log failed', err);
    // Non-fatal UI signal — inline error text (no toast, per D-04).
    // Consider setting a local `error` useState and rendering it near the submit button.
  }
});
```
Related: the initApp seed-goals error handler follows this same silent-log pattern at `main.tsx:60`.

### WR-06: `MealEntryRow` useEffect resets unsaved local edits when entry reference mutates

**File:** `src/features/food/MealEntryRow.tsx:31-34`
**Issue:** The `useEffect` resets `servings`/`bucket` whenever `entry.servings` or `entry.bucket` changes. In the single-user PWA that happens only via this component's own `handleSave` — which sets `editing=false` and the row re-renders to resting state, making this effect moot in practice. BUT: `useLiveQuery` in `TodayMealList` re-fetches on any mealEntries write, which hands a NEW `entry` object to this row on every unrelated mutation in the same day (e.g., adding a different meal). The identity change won't trigger this effect (the deps list the primitive fields, not the object), so we're safe for the common case. However, consuming `entry.servings`/`entry.bucket` via `values:` on a form or a derived memo would be more idiomatic and eliminates the reset-edits-mid-type failure mode entirely if future code ever DOES mutate the entry externally.
**Fix:** Either keep the useEffect and add an `editing` guard so an external mutation doesn't blow away an in-progress edit, or migrate to RHF with `values:` pattern already used in `GoalsForm` / `PTTemplateEditor`:
```tsx
useEffect(() => {
  if (editing) return; // never overwrite user edits mid-session
  setServings(entry.servings);
  setBucket(entry.bucket);
}, [entry.servings, entry.bucket, editing]);
```

## Info

### IN-01: `MacroTotalsBar` duplicates ProgressBar logic; the mandate comment acknowledges it

**File:** `src/features/food/MacroTotalsBar.tsx:1-80`
**Issue:** Four near-identical 20-line blocks that each compute `Math.min(100, (value / target) * 100)` and render a divided bar. The file correctly documents why it can't import the shared `ProgressBar` (h-2 vs h-1 and layout differ), but the four blocks themselves are a loop-able structure.
**Fix:** Extract a local helper + `.map` over the four macros:
```tsx
const macros = [
  { value: cals, target: tCals, label: 'cal', format: (n: number) => Math.round(n) },
  { value: p, target: tP, label: 'P', format: Math.round },
  { value: c, target: tC, label: 'C', format: Math.round },
  { value: f, target: tF, label: 'F', format: Math.round },
];
```
Cosmetic, not load-bearing. Keep the W-03 mandate comment.

### IN-02: `FoodSection` re-rounds the same value twice

**File:** `src/features/food/FoodSection.tsx:19,44`
**Issue:** `calsConsumed = Math.round(totals?.calories ?? 0)` at line 19, then `value={Math.round(totals?.calories ?? 0)}` at line 44. Two callers of `Math.round` on the same value; drop one.
**Fix:** `<ProgressBar value={calsConsumed} ... />`.

### IN-03: `PTExerciseRow` uses `UseFormRegister<any>` escape hatch

**File:** `src/features/pt/PTExerciseRow.tsx:28-30`
**Issue:** The explicit `any` disables TS's ability to flag a typo in the `register('exercises.${index}.actualSets', ...)` path strings. The row is called from one site (`PTSessionForm`) with a known `SessionFormValues` shape — export that type from `PTSessionForm` and parameterize the row.
**Fix:**
```tsx
// PTSessionForm.tsx
export type SessionFormValues = { /* ... */ };

// PTExerciseRow.tsx
import type { SessionFormValues } from './PTSessionForm';
interface PTExerciseRowProps {
  // ...
  register: UseFormRegister<SessionFormValues>;
}
```

### IN-04: `FoodCreateForm` uses `z.any()` for `photoFile` — bypasses schema

**File:** `src/features/food/FoodCreateForm.tsx:33,62,66`
**Issue:** `photoFile: z.any().optional()` accepts anything. Downstream code asserts `FileList` twice via `as FileList | undefined`. A stronger schema (or `.refine` that narrows to `FileList`/`File`) would remove the cast.
**Fix:** `photoFile: z.instanceof(FileList).optional()` — or at minimum type the form shape so `watch('photoFile')` is already `FileList | undefined`. Low priority given RHF's known quirks with file inputs.

### IN-05: Hardcoded error colour `#ef4444` in several components

**Files:**
- `src/features/food/FoodCreateForm.tsx:104,122,141,158,176,194`
- `src/features/food/MealEntryRow.tsx:123`
- `src/features/food/FoodPicker.tsx:129`
- `src/features/pt/PTTemplateEditor.tsx:154,187,245`
- `src/features/pt/PTTemplateList.tsx:119`
- `src/features/settings/GoalsForm.tsx:106,124,142,160,178`
**Issue:** 15+ copies of `style={{ color: '#ef4444' }}` for validation / destructive text. Centralise as a Tailwind token (`text-danger`) or a shared `<ErrorText>` component so a palette change is a one-line edit.
**Fix:** Add to Tailwind theme: `--color-danger: #ef4444;` → `className="text-danger"`. Replace all inline styles.

### IN-06: `PTSection` clones array before sort — unnecessary if Dexie returns a fresh array

**File:** `src/features/pt/PTSection.tsx:26`
**Issue:** `[...todaySessions].sort(...)` is a defensive copy that's only needed if `todaySessions` is a frozen or shared reference. Dexie's `useLiveQuery` returns a freshly-materialized array per fire, so the spread is redundant. Harmless and arguably good hygiene; call out because readers may copy this pattern.
**Fix:** Either delete the spread (`todaySessions.sort(...)`) or keep and add a one-line comment explaining it's defensive. Both are acceptable.

### IN-07: `PTSessionForm` previous-session hint can use stale `prevSession.painRating` on non-completed rows

**File:** `src/features/pt/PTSessionForm.tsx:94-106`
**Issue:** When the previous session has `actualSets`/`actualReps` both `undefined`, we render `Last: (not completed) · {relativeTime}`. That branch drops `painRating`, which is correct. The completed branch uses the session-level painRating — but painRating is a property of the whole session, not the row; if prior session had any completed exercise and a pain rating, we attach it to every row including uncompleted ones. The render logic line 94 only enters the completed branch `if (prev.actualSets !== undefined || prev.actualReps !== undefined)`, so the rows differ per-exercise. This is arguably intentional per UI-SPEC D-12; flagging so reviewers confirm the copy matches.
**Fix:** Confirm with UI-SPEC §"PT exercise row" that pain rating on the completed branch refers to the whole-session pain, not per-exercise, and add a clarifying comment above line 98 if so:
```tsx
// painRating is session-level (PT-05 D-12) — attached to any row whose prev had actuals.
```

### IN-08: Template editor `append` seeds `targetSets: 0, targetReps: 0` instead of `undefined`

**File:** `src/features/pt/PTTemplateEditor.tsx:99-100,250`
**Issue:** Both the default values for the first exercise and the `append` for new exercise rows seed `targetSets: 0, targetReps: 0`. Zod schema marks these fields `.optional()`, but seeding `0` means an unchanged exercise still persists with `targetSets === 0 && targetReps === 0` in the stored template — the session form then renders `Target: 0×0`, a misleading display. `cleanedExercises` at line 106 does NOT drop zero values (only `undefined` is stripped via the `!== undefined` check).
**Fix:** Seed with `undefined` so a user who doesn't fill in targets gets `Target: ` (hidden) instead of `Target: 0×0`:
```tsx
// Both the first-exercise default and the append():
{ name: '', description: '', targetSets: undefined, targetReps: undefined }
```
Alternatively, in `cleanedExercises`, strip zero values too:
```tsx
...(e.targetSets && e.targetSets > 0 ? { targetSets: e.targetSets } : {}),
```

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
