// src/features/food/FoodCreateForm.tsx
//
// Inline create-food form (RHF + Zod). Per D-06 save-and-log contract:
// onSubmit runs createFood, then logMeal, in sequence — two top-level awaits,
// NO Dexie wrapper (Pitfall #1). The photo pipeline (resize + OPFS save) lives
// INSIDE food.svc.createFood and executes BEFORE the Dexie put — this component
// only passes the raw File through.
//
// RHF rules applied (02-PATTERNS.md lines 920-941):
//   1. Coerce every numeric register to a number — HTML number inputs submit
//      strings; without the coercion flag Zod's .number() rejects them silently.
//   2. Only destructure `errors` from formState (lazy subscription).
//   3. Input binding uses `{...register('name', opts)}` spread — uncontrolled.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createFood } from '@/services/food.svc';
import { logMeal } from '@/services/meals.svc';
import { inferBucket, todayKey } from '@/lib/dayKey';

// Each macro is a non-negative integer capped at 10_000 (prevents pasted absurd
// values from corrupting computedCalories = calories * servings).
const foodCreateSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  calories: z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
  proteinG: z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
  carbsG: z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
  fatG: z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
  servingLabel: z.string().trim().min(1, 'Required'),
  photoFile: z.any().optional(),
});
type FoodCreateInput = z.infer<typeof foodCreateSchema>;

interface FoodCreateFormProps {
  initialName: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function FoodCreateForm({ initialName, onSaved, onCancel }: FoodCreateFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FoodCreateInput>({
    resolver: zodResolver(foodCreateSchema),
    values: {
      name: initialName,
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      servingLabel: '',
      photoFile: undefined,
    },
  });

  const photoFile = watch('photoFile') as FileList | undefined;
  const hasPhoto = !!(photoFile && photoFile.length > 0);

  const onSubmit = handleSubmit(async (data) => {
    const fileList = data.photoFile as FileList | undefined;
    const file = fileList && fileList.length > 0 ? fileList[0] : null;
    // Pitfall #1 + #8: resize + save happens INSIDE createFood, BEFORE any Dexie write.
    const food = await createFood({
      name: data.name.trim(),
      calories: data.calories,
      proteinG: data.proteinG,
      carbsG: data.carbsG,
      fatG: data.fatG,
      servingLabel: data.servingLabel.trim(),
      photoFile: file,
    });
    // D-06 — save-and-log: create AND log for today in a single action.
    await logMeal({
      food,
      servings: 1,
      bucket: inferBucket(),
      dayKey: todayKey(),
    });
    onSaved();
  });

  return (
    <div className="space-y-4 px-4">
      <h2 className="text-base font-semibold text-text">Add food</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="food-name" className="block text-xs text-muted">Name</label>
          <input
            id="food-name"
            type="text"
            placeholder="e.g. Ground beef"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'food-name-error' : undefined}
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            {...register('name')}
          />
          {errors.name && (
            <p id="food-name-error" className="text-xs" style={{ color: '#ef4444' }}>
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="food-calories" className="block text-xs text-muted">Calories</label>
          <input
            id="food-calories"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.calories}
            aria-describedby={errors.calories ? 'food-calories-error' : undefined}
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            {...register('calories', { valueAsNumber: true })}
          />
          {errors.calories && (
            <p id="food-calories-error" className="text-xs" style={{ color: '#ef4444' }}>
              {errors.calories.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="food-protein" className="block text-xs text-muted">Protein (g)</label>
          <input
            id="food-protein"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.proteinG}
            aria-describedby={errors.proteinG ? 'food-protein-error' : undefined}
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            {...register('proteinG', { valueAsNumber: true })}
          />
          {errors.proteinG && (
            <p id="food-protein-error" className="text-xs" style={{ color: '#ef4444' }}>
              {errors.proteinG.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="food-carbs" className="block text-xs text-muted">Carbs (g)</label>
          <input
            id="food-carbs"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.carbsG}
            aria-describedby={errors.carbsG ? 'food-carbs-error' : undefined}
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            {...register('carbsG', { valueAsNumber: true })}
          />
          {errors.carbsG && (
            <p id="food-carbs-error" className="text-xs" style={{ color: '#ef4444' }}>
              {errors.carbsG.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="food-fat" className="block text-xs text-muted">Fat (g)</label>
          <input
            id="food-fat"
            type="number"
            inputMode="numeric"
            aria-invalid={!!errors.fatG}
            aria-describedby={errors.fatG ? 'food-fat-error' : undefined}
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            {...register('fatG', { valueAsNumber: true })}
          />
          {errors.fatG && (
            <p id="food-fat-error" className="text-xs" style={{ color: '#ef4444' }}>
              {errors.fatG.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="food-serving" className="block text-xs text-muted">Serving</label>
          <input
            id="food-serving"
            type="text"
            placeholder="e.g. 100 g"
            aria-invalid={!!errors.servingLabel}
            aria-describedby={errors.servingLabel ? 'food-serving-error' : undefined}
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            {...register('servingLabel')}
          />
          {errors.servingLabel && (
            <p id="food-serving-error" className="text-xs" style={{ color: '#ef4444' }}>
              {errors.servingLabel.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <input
            id="food-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            {...register('photoFile')}
          />
          <label
            htmlFor="food-photo"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md border border-border bg-surface text-text text-sm font-medium cursor-pointer hover:bg-border/40"
          >
            <Camera className="w-4 h-4" aria-hidden />
            <span>{hasPhoto ? 'Change photo' : 'Add photo'}</span>
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="default">Save and log</Button>
        </div>
      </form>
    </div>
  );
}
