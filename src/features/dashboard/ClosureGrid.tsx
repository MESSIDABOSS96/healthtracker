// src/features/dashboard/ClosureGrid.tsx
// Closure history at a glance: last 12 weeks as a 7-row (weekday) grid of
// cells — full accent for closed days, dim for partial days, track for empty.
// One useLiveQuery upstream; this component is pure presentation.

import type { DayClosure } from '@/services/closure.svc';
import { addDays, keyToDate } from '@/lib/dayKey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const WEEKS = 12;

interface ClosureGridProps {
  todayKey: string;
  closures: Map<string, DayClosure>;
  streak: number | undefined;
}

export function ClosureGrid({ todayKey, closures, streak }: ClosureGridProps) {
  // Columns are weeks (oldest → newest), rows are Mon..Sun.
  const todayDow = (keyToDate(todayKey).getDay() + 6) % 7; // 0 = Monday
  const gridStart = addDays(todayKey, -(todayDow + (WEEKS - 1) * 7));

  const columns: string[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: string[] = [];
    for (let d = 0; d < 7; d++) {
      col.push(addDays(gridStart, w * 7 + d));
    }
    columns.push(col);
  }

  const cellClass = (key: string): { style?: React.CSSProperties; title: string } => {
    const c = closures.get(key);
    if (key > todayKey) return { style: { backgroundColor: 'transparent' }, title: '' };
    if (c?.closed) return { style: { backgroundColor: 'var(--accent)' }, title: `${key} — closed` };
    const partial = c && (c.food || c.lift || c.cardio);
    if (partial) {
      return { style: { backgroundColor: 'var(--accent-25)' }, title: `${key} — partial` };
    }
    return { style: { backgroundColor: 'var(--border)' }, title: `${key} — empty` };
  };

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle>Closed days</CardTitle>
        {streak !== undefined && streak > 0 && (
          <span className="text-xs text-muted tabular-nums">{streak} day streak</span>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="flex gap-1 justify-between"
          role="img"
          aria-label={`Closed-day history for the last ${WEEKS} weeks`}
        >
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-1 flex-1">
              {col.map(key => {
                const { style, title } = cellClass(key);
                return (
                  <div
                    key={key}
                    className="aspect-square w-full rounded-[3px]"
                    style={style}
                    title={title}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-[2px]" style={{ backgroundColor: 'var(--accent)' }} />
            closed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-[2px]" style={{ backgroundColor: 'var(--accent-25)' }} />
            partial
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
