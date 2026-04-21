// src/features/pt/PTExerciseRow.tsx
//
// Per-exercise row for PTSessionForm. Consumes the parent's RHF register()
// (feature: no standalone form state — all fields live on the parent form
// per D-19 no-Dexie-drafts policy).
//
// Layout per UI-SPEC §"PT exercise row (Session sheet)" (lines 520-529):
//   Row 1 (header): exercise name (left) + "Target: Nx〇" (right, muted)
//   Row 2 (prev hint, D-12): muted one-liner, hidden when previousHint is undefined
//   Row 3 (actuals): Sets / Reps (always) / Sec (only when target duration set)
//   Row 4 (completed): native checkbox + "Done" label
//   Row separator: bottom 1px --border, suppressed on the last row
//
// Accessibility: native <label htmlFor> pairs for each input.

import type { UseFormRegister } from 'react-hook-form';

interface PTExerciseRowProps {
  index: number;
  template: {
    name: string;
    targetSets?: number;
    targetReps?: number;
    targetDurationSec?: number;
    description?: string;
  };
  // Loosely typed register — the concrete SessionFormValues lives in PTSessionForm.
  // We only invoke it with known paths that conform to that shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  previousHint?: string;
}

function formatTarget(tpl: PTExerciseRowProps['template']): string {
  const bits: string[] = [];
  if (tpl.targetSets !== undefined && tpl.targetReps !== undefined) {
    bits.push(`${tpl.targetSets}×${tpl.targetReps}`);
  } else if (tpl.targetSets !== undefined) {
    bits.push(`${tpl.targetSets} sets`);
  } else if (tpl.targetReps !== undefined) {
    bits.push(`${tpl.targetReps} reps`);
  }
  if (tpl.targetDurationSec !== undefined) {
    bits.push(`${tpl.targetDurationSec}s`);
  }
  return bits.length > 0 ? `Target: ${bits.join(' · ')}` : '';
}

export function PTExerciseRow({ index, template, register, previousHint }: PTExerciseRowProps) {
  const target = formatTarget(template);
  const showSec = template.targetDurationSec !== undefined;

  return (
    <div className="space-y-2 pb-4 border-b border-border last:border-b-0">
      {/* Row 1: name + target */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-text">{template.name}</span>
        {target && <span className="text-xs text-muted">{target}</span>}
      </div>

      {/* Optional description — muted one-liner below name */}
      {template.description && (
        <div className="text-xs text-muted">{template.description}</div>
      )}

      {/* Row 2: previous-session hint (D-12) */}
      {previousHint && <div className="text-xs text-muted">{previousHint}</div>}

      {/* Row 3: actuals inputs */}
      <div className="flex gap-2">
        <div className="flex flex-col">
          <label htmlFor={`ex-${index}-sets`} className="text-xs text-muted">Sets</label>
          <input
            id={`ex-${index}-sets`}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums"
            {...register(`exercises.${index}.actualSets`, { valueAsNumber: true })}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={`ex-${index}-reps`} className="text-xs text-muted">Reps</label>
          <input
            id={`ex-${index}-reps`}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums"
            {...register(`exercises.${index}.actualReps`, { valueAsNumber: true })}
          />
        </div>
        {showSec && (
          <div className="flex flex-col">
            <label htmlFor={`ex-${index}-sec`} className="text-xs text-muted">Sec</label>
            <input
              id={`ex-${index}-sec`}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums"
              {...register(`exercises.${index}.actualDurationSec`, { valueAsNumber: true })}
            />
          </div>
        )}
      </div>

      {/* Row 4: completed checkbox + Done label */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`ex-${index}-done`}
          className="accent-accent h-4 w-4"
          {...register(`exercises.${index}.completed`)}
        />
        <label htmlFor={`ex-${index}-done`} className="text-sm text-text">Done</label>
      </div>
    </div>
  );
}
