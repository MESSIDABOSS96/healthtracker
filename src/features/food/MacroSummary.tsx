// src/features/food/MacroSummary.tsx
// Live calories + macro totals vs targets for a day. Four 8px progress rows.

import { ProgressBar } from '@/components/ProgressBar';
import { useDailyTotals } from './hooks';
import { useGoals } from '@/features/settings/hooks';

export function MacroSummary({ dayKey }: { dayKey: string }) {
  const totals = useDailyTotals(dayKey);
  const goals = useGoals();

  const rows = [
    { label: 'Cal', value: Math.round(totals?.calories ?? 0), max: goals?.calories ?? 0 },
    { label: 'P', value: Math.round(totals?.proteinG ?? 0), max: goals?.proteinG ?? 0 },
    { label: 'C', value: Math.round(totals?.carbsG ?? 0), max: goals?.carbsG ?? 0 },
    { label: 'F', value: Math.round(totals?.fatG ?? 0), max: goals?.fatG ?? 0 },
  ];

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-xs text-muted w-7">{r.label}</span>
          <ProgressBar value={r.value} max={r.max} ariaLabel={`${r.label} progress`} className="flex-1" />
          <span className="text-xs text-muted tabular-nums w-20 text-right">
            {r.value}
            {r.max > 0 ? ` / ${r.max}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
