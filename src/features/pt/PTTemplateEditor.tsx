// src/features/pt/PTTemplateEditor.tsx
//
// Nested Sheet that opens inside the PT Sheet (D-10). Creates or edits a
// PTTemplate with a full PT-01 field set: name + ordered exercise rows
// where each exercise has a name, optional description, and optional
// target sets/reps/duration.
//
// RHF + Zod rules (02-PATTERNS.md lines 920-941 — applied identically to
// GoalsForm):
//   1. Coerce every numeric register to a number (HTML inputs submit strings;
//      Zod .number() rejects them silently without coercion).
//   2. Use the `values:` option (never the default-values variant) so the form
//      re-syncs when the template prop changes (edit-a-different-template case).
//   3. Only destructure `errors` from formState (lazy subscription).
//   4. Input binding uses `{...register(...)}` spread — uncontrolled.
//
// Zod schema caps per-field ints at 999 (sets/reps) and 99_999 (duration sec)
// per plan <threat_model> integer-overflow mitigation. Description is stored
// only when non-empty after trim — empty strings are dropped on save so the
// stored exercise object stays clean.

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { createTemplate, updateTemplate } from '@/services/pt.svc';
import type { PTTemplate } from '@/db/schema';

const exerciseSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  description: z.string().trim().optional(),
  targetSets: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(999, 'Too large')
    .optional(),
  targetReps: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(999, 'Too large')
    .optional(),
  targetDurationSec: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(99_999, 'Too large')
    .optional(),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  exercises: z.array(exerciseSchema).min(1, 'At least one exercise'),
});

type TemplateInput = z.infer<typeof templateSchema>;

interface PTTemplateEditorProps {
  open: boolean;
  mode: 'new' | 'edit';
  template?: PTTemplate;
  onClose: () => void;
}

export function PTTemplateEditor({
  open,
  mode,
  template,
  onClose,
}: PTTemplateEditorProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    values: template
      ? {
          name: template.name,
          exercises: template.exercises.map((e) => ({
            name: e.name,
            description: e.description ?? '',
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            targetDurationSec: e.targetDurationSec,
          })),
        }
      : {
          name: '',
          exercises: [{ name: '', description: '', targetSets: 0, targetReps: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'exercises' });

  const onSubmit = handleSubmit(async (data) => {
    const cleanedExercises = data.exercises.map((e) => ({
      name: e.name,
      ...(e.description && e.description.trim()
        ? { description: e.description.trim() }
        : {}),
      ...(e.targetSets !== undefined ? { targetSets: e.targetSets } : {}),
      ...(e.targetReps !== undefined ? { targetReps: e.targetReps } : {}),
      ...(e.targetDurationSec !== undefined
        ? { targetDurationSec: e.targetDurationSec }
        : {}),
    }));
    if (mode === 'edit' && template) {
      await updateTemplate({
        ...template,
        name: data.name,
        exercises: cleanedExercises,
      });
    } else {
      await createTemplate({
        name: data.name,
        exercises: cleanedExercises,
      });
    }
    onClose();
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <SheetHeader>
          <SheetTitle>{mode === 'new' ? 'New template' : 'Edit template'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {/* Template name */}
          <div className="space-y-1">
            <label htmlFor="tmpl-name" className="block text-xs text-muted">Name</label>
            <input
              id="tmpl-name"
              type="text"
              placeholder="e.g. Upper Body"
              aria-invalid={!!errors.name}
              className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{errors.name.message}</p>
            )}
          </div>

          {/* Exercises section */}
          <div className="space-y-2">
            <div className="text-xs text-muted uppercase tracking-wide">Exercises</div>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2 pb-3 border-b border-border last:border-b-0"
              >
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label htmlFor={`ex-${index}-name`} className="block text-xs text-muted">Name</label>
                    <input
                      id={`ex-${index}-name`}
                      type="text"
                      aria-invalid={!!errors.exercises?.[index]?.name}
                      className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text"
                      {...register(`exercises.${index}.name`)}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove exercise"
                    onClick={() => remove(index)}
                    className="h-11 w-11 flex items-center justify-center text-muted"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                {errors.exercises?.[index]?.name && (
                  <p className="text-xs" style={{ color: '#ef4444' }}>
                    {errors.exercises[index]?.name?.message}
                  </p>
                )}

                {/* PT-01 optional description — compact inline row below name */}
                <div>
                  <input
                    id={`ex-${index}-description`}
                    type="text"
                    placeholder="Description (optional)"
                    aria-label="Description"
                    className="h-9 w-full px-3 text-sm text-muted rounded-md bg-bg border border-border"
                    {...register(`exercises.${index}.description`)}
                  />
                </div>

                <div className="flex gap-2">
                  <div className="space-y-1">
                    <label htmlFor={`ex-${index}-tSets`} className="block text-xs text-muted">Sets</label>
                    <input
                      id={`ex-${index}-tSets`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums"
                      {...register(`exercises.${index}.targetSets`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`ex-${index}-tReps`} className="block text-xs text-muted">Reps</label>
                    <input
                      id={`ex-${index}-tReps`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums"
                      {...register(`exercises.${index}.targetReps`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`ex-${index}-tDur`} className="block text-xs text-muted">Duration (sec)</label>
                    <input
                      id={`ex-${index}-tDur`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      className="h-11 w-20 px-2 rounded-md bg-bg border border-border text-text tabular-nums"
                      {...register(`exercises.${index}.targetDurationSec`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {errors.exercises && !Array.isArray(errors.exercises) && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{errors.exercises.message}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: '', description: '', targetSets: 0, targetReps: 0 })}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden /><span>Add exercise</span>
            </Button>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="default">Save template</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
