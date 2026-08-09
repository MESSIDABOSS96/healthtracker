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

  const calories = Math.round(totals?.calories ?? 0);
  const calorieTarget = goals?.calories ?? 0;
  const remaining = calorieTarget - calories;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="stat text-[34px] leading-none font-semibold text-text">
              {calories.toLocaleString()}
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
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-hairline pt-3.5">
        {MACROS.map(({ key, label, color }) => {
          const value = Math.round(totals?.[key] ?? 0);
          const max = goals?.[key] ?? 0;
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted">{label}</p>
              <p className="stat text-[15px] font-semibold text-text">
                {value}
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
