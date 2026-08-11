// src/features/food/MacroSummary.tsx
// Live calories + macro totals vs targets for a day.
//
// Calories are the headline and the three macros support it, so they're set
// that way: one large figure with its own bar, then a three-column strip
// underneath. The previous four identical rows gave protein the same weight as
// the day's calorie total, which is not how anyone reads this screen.
//
// D-16 zero-target sentinel: when a target is 0, the figure renders alone —
// no bar, no "/ 0" denominator.

import { Meter } from '@/components/ui/meter';
import { useDailyTotals } from './hooks';
import { useGoals } from '@/features/settings/hooks';

const MACROS = [
  { key: 'proteinG', label: 'Protein', color: 'var(--ring-lift)' },
  { key: 'carbsG', label: 'Carbs', color: 'var(--ring-cardio)' },
  { key: 'fatG', label: 'Fat', color: 'var(--muted)' },
] as const;

export function MacroSummary({ dayKey }: { dayKey: string }) {
  const totals = useDailyTotals(dayKey);
  const goals = useGoals();

  const calories = Math.round(totals?.total.calories ?? 0);
  const calorieTarget = goals?.calories ?? 0;
  const remaining = calorieTarget - calories;
  // A day holding a meal with no calorie figure has a FLOOR, not a total. The
  // "+" and the note below are not decoration: without them an incomplete day
  // reads exactly like a complete one, and "1,200 left" would be a promise the
  // data can't keep.
  const missingCalories = totals?.missing.calories ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="stat text-[34px] leading-none font-semibold text-text">
              {calories.toLocaleString()}
              {missingCalories > 0 && <span className="text-muted">+</span>}
            </span>
            <span className="text-[13px] text-muted">cal</span>
          </div>
          {calorieTarget > 0 && (
            <span className="text-xs text-muted">
              {remaining >= 0 ? (
                <>
                  <span className="stat text-text">{remaining.toLocaleString()}</span> left of{' '}
                  <span className="stat">{calorieTarget.toLocaleString()}</span>
                </>
              ) : (
                <span style={{ color: 'var(--warn)' }}>
                  <span className="stat">{Math.abs(remaining).toLocaleString()}</span> over
                </span>
              )}
            </span>
          )}
        </div>
        {calorieTarget > 0 && (
          <Meter
            value={calories}
            max={calorieTarget}
            size={8}
            color={remaining >= 0 ? 'var(--accent)' : 'var(--warn)'}
            ariaLabel="Calories progress"
            className="mt-2.5"
          />
        )}
        {missingCalories > 0 && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-warn">
            {missingCalories} {missingCalories === 1 ? 'meal has' : 'meals have'} no calorie
            figure — this total is a floor, and the day can&apos;t close on calories until
            {missingCalories === 1 ? ' it is' : ' they are'} filled in.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-hairline pt-3.5">
        {MACROS.map(({ key, label, color }) => {
          const value = Math.round(totals?.total[key] ?? 0);
          const missing = totals?.missing[key] ?? 0;
          const max = goals?.[key] ?? 0;
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted">{label}</p>
              <p className="stat text-[15px] font-semibold text-text">
                {value}
                {missing > 0 && <span className="text-muted">+</span>}
                <span className="text-faint font-medium">{max > 0 ? ` / ${max}g` : 'g'}</span>
              </p>
              {max > 0 && (
                <Meter value={value} max={max} color={color} ariaLabel={`${label} progress`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
