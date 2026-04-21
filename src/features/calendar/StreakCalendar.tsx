// src/features/calendar/StreakCalendar.tsx
// CalendarScreen composer. Owns the currently-viewed {year, month0} local state
// and stacks: StreakCount → MonthHeader → WeekdayHeader → MonthGrid. Month-nav
// clamps (UI-SPEC:219-221):
//   upper bound = today's month (future-month navigation blocked)
//   lower bound = month of getEarliestDayKey() (if null: lower==upper)

import { useState } from 'react';
import { StreakCount } from './StreakCount';
import { MonthHeader } from './MonthHeader';
import { WeekdayHeader } from './WeekdayHeader';
import { MonthGrid } from './MonthGrid';
import { useEarliestDayKey } from './hooks';
import { todayKey, keyToDate } from '@/lib/dayKey';

interface ViewMonth {
  year: number;
  month0: number;
}

function viewFromKey(key: string): ViewMonth {
  const d = keyToDate(key);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

function sameMonth(a: ViewMonth, b: ViewMonth): boolean {
  return a.year === b.year && a.month0 === b.month0;
}

function shiftMonth(v: ViewMonth, delta: number): ViewMonth {
  // Use Date math so December→January and year-boundaries work correctly.
  const d = new Date(v.year, v.month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

export function StreakCalendar() {
  const todayView = viewFromKey(todayKey());
  const [view, setView] = useState<ViewMonth>(todayView);

  const earliest = useEarliestDayKey(); // string | null | undefined
  const earliestView: ViewMonth = earliest ? viewFromKey(earliest) : todayView;

  const prevDisabled = sameMonth(view, earliestView);
  const nextDisabled = sameMonth(view, todayView);

  const handlePrev = () => {
    if (prevDisabled) return;
    setView((v) => shiftMonth(v, -1));
  };
  const handleNext = () => {
    if (nextDisabled) return;
    setView((v) => shiftMonth(v, 1));
  };

  return (
    <div className="space-y-2">
      <StreakCount />
      <MonthHeader
        year={view.year}
        month0={view.month0}
        onPrev={handlePrev}
        onNext={handleNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />
      <WeekdayHeader />
      <MonthGrid year={view.year} month0={view.month0} />
    </div>
  );
}
