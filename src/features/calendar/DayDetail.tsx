// src/features/calendar/DayDetail.tsx
// Per-day detail composer for /#/day/:dayKey. Past-day edit contract (UI-SPEC
// §263-268) fully wired:
//   - Meal edit/delete: reuses Phase 2 MealEntryRow (props take `entry` + `food`,
//     no dayKey needed — the entry.id drives updateMealEntry / deleteMealEntry).
//   - Steps edit: reuses StepsInlineInput with explicit dayKey={dayKey} prop
//     (extended in Task 2 to accept dayKey?: string; default preserves Today
//     behavior for Phase 2 callers).
//   - Lift edit: reuses LiftToggle + LiftNoteInput with explicit dayKey={dayKey}.
//   - PT edit: opens the PT Session Sheet via editSession prop (Task 3 extension).
//     saveSession (put-by-id upsert) preserves the session's dayKey + id, so
//     the record updates in place rather than duplicating.
//
// Destructive color hex carry-forward: the four Delete buttons use the Phase 2
// #ef4444 inline style precedent (see MealEntryRow.tsx:123). Phase 3 does not
// introduce a --destructive token in tokens.css (frontmatter policy note).
//
// D-14 (Phase 2 carry-forward): food totals compare against CURRENT goals —
// useGoals() reads the singleton, no per-day snapshot.
// UI-SPEC `<deferred>`: no backdated NEW-log adding here — edit/delete only.

import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';  // NEW — D-06
import { DayDetailHeader } from './DayDetailHeader';
import { DayDetailSection } from './DayDetailSection';
import { useDayDetail } from './hooks';
import { useAllFoods } from '@/features/food/hooks';
import { useGoals } from '@/features/settings/hooks';
import { MealEntryRow } from '@/features/food/MealEntryRow';
import { StepsInlineInput } from '@/features/steps/StepsInlineInput';
import { LiftToggle } from '@/features/lifts/LiftToggle';
import { LiftNoteInput } from '@/features/lifts/LiftNoteInput';
import { PTSheet } from '@/features/pt/PTSheet';
import { deleteSession } from '@/services/pt.svc';
import { deleteSteps } from '@/services/steps.svc';
import { deleteLift } from '@/services/lifts.svc';
import type { Food, MealBucket, MealEntry, PTSession } from '@/db/schema';

interface DayDetailProps {
  dayKey: string;
}

const BUCKET_ORDER: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function DayDetail({ dayKey }: DayDetailProps) {
  const { sessions, meals, steps, lift, totals } = useDayDetail(dayKey);
  const allFoods = useAllFoods();
  const goals = useGoals();

  // Steps row local state: tap "Edit" to reveal StepsInlineInput; commit/cancel hides it.
  const [editingSteps, setEditingSteps] = useState(false);
  // Lift note row local state: mirrors Today's LiftSection pattern — tap "Edit note" to reveal input.
  const [editingLiftNote, setEditingLiftNote] = useState(false);
  // PT edit-sheet: tap a past session's row to open PTSheet in edit mode.
  const [editingPTSession, setEditingPTSession] = useState<PTSession | undefined>(undefined);
  const [confirmDeleteLift, setConfirmDeleteLift] = useState(false);   // Phase 4 D-06

  const foodById = useMemo(() => {
    const m = new Map<string, Food>();
    (allFoods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [allFoods]);

  // Filled-count summary row (UI-SPEC:243).
  const count =
    Number((sessions?.length ?? 0) >= 1) +
    Number((meals?.length ?? 0) >= 1) +
    Number((steps?.count ?? 0) > 0) +
    Number(lift?.lifted === true);

  const summary =
    count === 0 ? 'no logs yet' :
    count === 4 ? 'all 4 logged' :
                  `${count} of 4 logged`;

  // Food macros subtitle — D-14 against current goals.
  let foodSubtitle: string | undefined;
  if (totals && (meals?.length ?? 0) > 0) {
    foodSubtitle =
      `${Math.round(totals.calories)} cal · ` +
      `${Math.round(totals.proteinG)}g P · ` +
      `${Math.round(totals.carbsG)}g C · ` +
      `${Math.round(totals.fatG)}g F`;
  }

  // Group meals by bucket (UI-SPEC:459 — reuses Phase 2 D-18 section-grouped layout).
  const mealsByBucket = new Map<MealBucket, MealEntry[]>();
  for (const b of BUCKET_ORDER) mealsByBucket.set(b, []);
  (meals ?? []).forEach((e) => {
    const bucket = mealsByBucket.get(e.bucket) ?? [];
    bucket.push(e);
    mealsByBucket.set(e.bucket, bucket);
  });

  return (
    <div className="space-y-6">
      <DayDetailHeader dayKey={dayKey} />

      <div className="text-sm text-muted text-center">{summary}</div>

      {/* ---------- PT ---------- */}
      <DayDetailSection title="PT">
        {(sessions?.length ?? 0) === 0 && (
          <p className="text-sm text-muted">No PT session logged on this day.</p>
        )}
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={() => setEditingPTSession(s)}
              aria-label="Edit PT session"
              className="flex-1 text-left text-sm font-semibold text-text py-1 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {`Session · ${s.exercises?.length ?? 0} exercises`}
            </button>
            <button
              type="button"
              aria-label="Delete PT session"
              onClick={() => deleteSession(s.id)}
              style={{ color: '#ef4444' }}
              className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Delete
            </button>
          </div>
        ))}
      </DayDetailSection>

      {/* PT edit Sheet (controlled) — UI-SPEC:246 */}
      <Sheet
        open={editingPTSession !== undefined}
        onOpenChange={(open) => { if (!open) setEditingPTSession(undefined); }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <SheetHeader><SheetTitle>PT</SheetTitle></SheetHeader>
          {editingPTSession && (
            <PTSheet
              onClose={() => setEditingPTSession(undefined)}
              editSession={editingPTSession}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ---------- Food ---------- */}
      <DayDetailSection title="Food" subtitle={foodSubtitle}>
        {(meals?.length ?? 0) === 0 && (
          <p className="text-sm text-muted">No meals logged on this day.</p>
        )}
        {BUCKET_ORDER.map((bucket) => {
          const entries = mealsByBucket.get(bucket) ?? [];
          if (entries.length === 0) return null;
          return (
            <div key={bucket} className="space-y-1">
              <p className="text-xs text-muted uppercase tracking-wide">{bucket}</p>
              <ul>
                {entries.map((e) => (
                  <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />
                ))}
              </ul>
            </div>
          );
        })}
      </DayDetailSection>

      {/* ---------- Steps ---------- */}
      <DayDetailSection title="Steps">
        {!steps ? (
          <p className="text-sm text-muted">No steps logged on this day.</p>
        ) : (
          <div className="flex items-center justify-between">
            {editingSteps ? (
              <StepsInlineInput
                dayKey={dayKey}
                currentCount={steps.count}
                onCommitted={() => setEditingSteps(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingSteps(true)}
                aria-label="Edit step count"
                className="text-sm font-semibold text-text py-1 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {steps.count} steps
              </button>
            )}
            <button
              type="button"
              aria-label="Delete step entry"
              onClick={() => deleteSteps(dayKey)}
              style={{ color: '#ef4444' }}
              className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Delete
            </button>
          </div>
        )}
        {steps && (goals?.steps ?? 0) > 0 && (
          <p className="text-xs text-muted">{`against ${goals!.steps}-step goal`}</p>
        )}
      </DayDetailSection>

      {/* ---------- Lift ---------- */}
      <DayDetailSection title="Lift">
        {!lift ? (
          <p className="text-sm text-muted">No lift check-in on this day.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <LiftToggle dayKey={dayKey} lifted={lift.lifted} />
              <button
                type="button"
                aria-label="Delete lift check-in"
                onClick={() => setConfirmDeleteLift(true)}
                style={{ color: '#ef4444' }}
                className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Delete
              </button>
            </div>
            {editingLiftNote ? (
              <LiftNoteInput
                dayKey={dayKey}
                currentNote={lift.note ?? ''}
                onCommitted={() => setEditingLiftNote(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingLiftNote(true)}
                aria-label="Edit lift note"
                className="w-full text-left text-sm text-muted py-1 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {lift.note ? lift.note : 'Add a note'}
              </button>
            )}
          </div>
        )}
      </DayDetailSection>

      {/* Phase 4 D-06 — destructive confirm for Lift delete (WR-03 closure) */}
      <ConfirmDialog
        open={confirmDeleteLift}
        onOpenChange={setConfirmDeleteLift}
        title="Remove lift check-in?"
        body={`Remove lift check-in for ${dayKey}? Note will be deleted too.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => deleteLift(dayKey)}
      />
    </div>
  );
}
