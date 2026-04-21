// src/features/pt/PTSessionForm.tsx
//
// Session-logging form rendered inside the PT Sheet when a template is
// selected. Pre-populates one row per template exercise with blank actuals
// and completed=false (PT-03). Previous-session hint per row uses the D-12
// copy format:
//   `Last: {sets}×{reps} · pain {rating}/5 · {relativeTime}`
//   `Last: (not completed) · {relativeTime}`
//   (row hidden when there is no prior session)
//
// Per D-19 all fields live in React Hook Form state only until the Save
// button commits — no Dexie draft writes. No Zod resolver per D-11/D-19
// (partial sessions are valid; whatever the user filled in is what persists).
//
// On Save: construct a full PTSession and pass to saveSession; then
// onClose() fires so the Sheet closes instantly per D-04 (no toast / no
// success modal).

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  saveSession,
  formatRelativeDays,
} from '@/services/pt.svc';
import { todayKey } from '@/lib/dayKey';
import type { PTSession, PTTemplate } from '@/db/schema';
import { PTExerciseRow } from './PTExerciseRow';
import { PainRating } from './PainRating';
import { useLastSessionForTemplate } from './hooks';

type SessionFormValues = {
  exercises: Array<{
    name: string;
    actualSets?: number;
    actualReps?: number;
    actualDurationSec?: number;
    completed: boolean;
  }>;
  painRating?: number;
  notes?: string;
};

interface PTSessionFormProps {
  template: PTTemplate;
  onClose: () => void;
}

export function PTSessionForm({ template, onClose }: PTSessionFormProps) {
  const prevSession = useLastSessionForTemplate(template.id);

  const { register, handleSubmit, watch, setValue } = useForm<SessionFormValues>({
    // D-19: form-local state; `values:` re-syncs if the template changes.
    values: {
      exercises: template.exercises.map((e) => ({
        name: e.name,
        actualSets: undefined,
        actualReps: undefined,
        actualDurationSec: undefined,
        completed: false,
      })),
      painRating: undefined,
      notes: '',
    },
  });

  const painValue = watch('painRating');

  const onSubmit = handleSubmit(async (data) => {
    const session: PTSession = {
      id: crypto.randomUUID(),
      dayKey: todayKey(),
      templateId: template.id,
      loggedAt: Date.now(),
      exercises: data.exercises.map((e) => ({
        name: e.name,
        actualSets: e.actualSets,
        actualReps: e.actualReps,
        actualDurationSec: e.actualDurationSec,
        completed: !!e.completed,
      })),
      painRating: data.painRating,
      notes: data.notes?.trim() ? data.notes.trim() : undefined,
    };
    await saveSession(session);
    onClose(); // D-04: Sheet closes immediately — no success UI.
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-4 pt-4">
      <div className="space-y-4">
        {template.exercises.map((ex, index) => {
          const prev = prevSession?.exercises.find((p) => p.name === ex.name);
          let hint: string | undefined;
          if (prev && prevSession) {
            if (prev.actualSets !== undefined || prev.actualReps !== undefined) {
              const sets = prev.actualSets ?? '–';
              const reps = prev.actualReps ?? '–';
              const painPart =
                prevSession.painRating !== undefined
                  ? ` · pain ${prevSession.painRating}/5`
                  : '';
              hint = `Last: ${sets}×${reps}${painPart} · ${formatRelativeDays(prevSession.loggedAt)}`;
            } else {
              hint = `Last: (not completed) · ${formatRelativeDays(prevSession.loggedAt)}`;
            }
          }
          return (
            <PTExerciseRow
              key={index}
              index={index}
              template={ex}
              register={register}
              previousHint={hint}
            />
          );
        })}
      </div>

      <PainRating
        value={painValue}
        onChange={(n) => setValue('painRating', n)}
      />

      <div className="space-y-1">
        <label htmlFor="session-notes" className="block text-xs text-muted">Notes</label>
        <textarea
          id="session-notes"
          placeholder="How did it feel?"
          className="w-full min-h-[80px] px-3 py-2 rounded-md bg-bg border border-border text-text"
          {...register('notes')}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="default">Save session</Button>
      </div>
    </form>
  );
}
