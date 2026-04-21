// src/features/calendar/MonthGrid.tsx
// 42-cell activity grid for (year, month0). ONE useLiveQuery subscription via
// useMonthStreakData drives all 42 DayCells — Anti-Pattern 3 (per-cell IDB) is
// an auto-fail. On undefined data (first microtask of render), all 42 cells
// render as 0/4 --surface (UI-SPEC:690 — no skeleton, no null-return).

import { useMonthStreakData } from './hooks';
import { DayCell } from './DayCell';
import { todayKey } from '@/lib/dayKey';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const EMPTY_FILL = { pt: false, food: false, steps: false, lift: false } as const;

export interface MonthGridProps {
  year: number;
  month0: number;
}

export function MonthGrid({ year, month0 }: MonthGridProps) {
  const { data, cells } = useMonthStreakData(year, month0);
  const today = todayKey();
  const gridLabel = `${MONTH_NAMES[month0]} ${year} activity calendar`;

  return (
    <div
      role="grid"
      aria-label={gridLabel}
      className="grid grid-cols-7 gap-1"
    >
      {cells.map((cell) => (
        <DayCell
          key={cell.dayKey}
          dayKey={cell.dayKey}
          inMonth={cell.inMonth}
          today={cell.dayKey === today}
          filled={data?.get(cell.dayKey) ?? EMPTY_FILL}
        />
      ))}
    </div>
  );
}
