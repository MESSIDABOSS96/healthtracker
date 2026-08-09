// src/features/settings/GoalsForm.tsx
//
// Daily goals form — the ONLY user-facing way to set calorie/macro/step targets.
// Pre-populates from the Goals singleton (seeded in P1 initApp Step 6.5, so the
// form is never empty on first launch). Saving persists all 5 fields atomically
// via goals.svc.saveGoals; any component subscribed via useLiveQuery (Today
// macro / step progress bars built in P3/P5) re-renders without a reload.
//
// Key RHF rules applied (02-PATTERNS.md lines 920-941):
//   1. Coerce every numeric register to a number — HTML number inputs submit
//      strings; without the coercion flag Zod's .number() rejects them silently.
//   2. `values:` (not `defaultValues:`) — current arrives reactively from
//      useLiveQuery; defaultValues would only snapshot the first render.
//   3. Only destructure `errors` from formState (lazy subscription).
//   4. Input binding uses `{...register('name', opts)}` spread — uncontrolled.
//
// Per D-04 (no toasts) + UI-SPEC §"Goals form (Settings)" Save success row:
// no toast, no spinner, no modal after save. useLiveQuery reactivity is the
// signal.

import { Flag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { field, label as labelClass } from '@/components/ui/styles';
import { Segmented } from '@/components/ui/segmented';
import { SettingsCard } from './SettingsCard';
import { useGoals } from './hooks';
import { saveGoals } from '@/services/goals.svc';

// Schema: each goal is a non-negative integer capped at 1_000_000.
// - .int() + .min(0): D-15 (whole numbers) + D-16 (zero-target sentinel permitted).
// - .max(1_000_000): sanity upper bound — prevents integer-overflow in ProgressBar
//   math (threat model: pasting 9999999999 into calories would render Infinity).
// - { message: ... }: Zod 4 first-error strings matched verbatim to
//   UI-SPEC §"Goals form (Settings)" validation-error rows.
const goalsSchema = z.object({
  calories: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(1_000_000, 'Too large'),
  proteinG: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(1_000_000, 'Too large'),
  carbsG: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(1_000_000, 'Too large'),
  fatG: z
    .number({ message: 'Required' })
    .int({ message: 'Whole number only' })
    .min(0, 'Must be 0 or higher')
    .max(1_000_000, 'Too large'),
  weightUnit: z.enum(['lb', 'kg']),
});
type GoalsInput = z.infer<typeof goalsSchema>;

const WEIGHT_UNITS = [
  { value: 'lb', label: 'lb' },
  { value: 'kg', label: 'kg' },
] as const satisfies ReadonlyArray<{ value: GoalsInput['weightUnit']; label: string }>;

export function GoalsForm() {
  const current = useGoals();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GoalsInput>({
    resolver: zodResolver(goalsSchema),
    // `values:` re-syncs the form when useLiveQuery resolves (rule #2).
    values: current
      ? {
          calories: current.calories,
          proteinG: current.proteinG,
          carbsG: current.carbsG,
          fatG: current.fatG,
          weightUnit: current.weightUnit ?? 'lb',
        }
      : undefined,
  });
  const weightUnit = watch('weightUnit') ?? 'lb';

  const onSubmit = handleSubmit(async (data) => {
    await saveGoals(data);
    // No success UI per D-04 — useLiveQuery is the signal.
  });

  return (
    <SettingsCard
      title="Daily goals"
      icon={Flag}
      description="Today's targets. These drive the meters on the Daily tab."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="goals-calories" className={`block ${labelClass}`}>Calories</label>
          <input
            id="goals-calories"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.calories}
            aria-describedby={errors.calories ? 'goals-calories-error' : undefined}
            className={`${field} stat`}
            {...register('calories', { valueAsNumber: true })}
          />
          {errors.calories && (
            <p id="goals-calories-error" className="text-xs text-danger">
              {errors.calories.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="goals-protein" className={`block ${labelClass}`}>Protein (g)</label>
          <input
            id="goals-protein"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.proteinG}
            aria-describedby={errors.proteinG ? 'goals-protein-error' : undefined}
            className={`${field} stat`}
            {...register('proteinG', { valueAsNumber: true })}
          />
          {errors.proteinG && (
            <p id="goals-protein-error" className="text-xs text-danger">
              {errors.proteinG.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="goals-carbs" className={`block ${labelClass}`}>Carbs (g)</label>
          <input
            id="goals-carbs"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.carbsG}
            aria-describedby={errors.carbsG ? 'goals-carbs-error' : undefined}
            className={`${field} stat`}
            {...register('carbsG', { valueAsNumber: true })}
          />
          {errors.carbsG && (
            <p id="goals-carbs-error" className="text-xs text-danger">
              {errors.carbsG.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="goals-fat" className={`block ${labelClass}`}>Fat (g)</label>
          <input
            id="goals-fat"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.fatG}
            aria-describedby={errors.fatG ? 'goals-fat-error' : undefined}
            className={`${field} stat`}
            {...register('fatG', { valueAsNumber: true })}
          />
          {errors.fatG && (
            <p id="goals-fat-error" className="text-xs text-danger">
              {errors.fatG.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className={`block ${labelClass}`}>Weight unit</p>
          <Segmented
            value={weightUnit}
            onChange={u => setValue('weightUnit', u, { shouldDirty: true })}
            options={WEIGHT_UNITS}
            ariaLabel="Weight unit"
          />
        </div>

        <Button type="submit" variant="default" className="w-full">
          Save goals
        </Button>
      </form>
    </SettingsCard>
  );
}
