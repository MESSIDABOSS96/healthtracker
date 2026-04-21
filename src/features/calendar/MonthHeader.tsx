// src/features/calendar/MonthHeader.tsx
// Prev-chevron · "Month Year" · Next-chevron row. Clamp booleans arrive as
// props — caller (StreakCalendar) computes them from useEarliestDayKey + todayKey.

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface MonthHeaderProps {
  year: number;
  month0: number; // 0..11
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}

export function MonthHeader({ year, month0, onPrev, onNext, prevDisabled, nextDisabled }: MonthHeaderProps) {
  const label = `${MONTH_NAMES[month0]} ${year}`;

  return (
    <div className="flex items-center justify-between h-12 border-b border-border">
      <button
        type="button"
        aria-label="Previous month"
        aria-disabled={prevDisabled}
        disabled={prevDisabled}
        onClick={onPrev}
        className={
          'h-11 w-11 flex items-center justify-center rounded-md ' +
          'text-muted ' +
          'disabled:text-border disabled:pointer-events-none ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
          'active:bg-border/40'
        }
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <h2 className="text-base font-semibold text-text">{label}</h2>

      <button
        type="button"
        aria-label="Next month"
        aria-disabled={nextDisabled}
        disabled={nextDisabled}
        onClick={onNext}
        className={
          'h-11 w-11 flex items-center justify-center rounded-md ' +
          'text-muted ' +
          'disabled:text-border disabled:pointer-events-none ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
          'active:bg-border/40'
        }
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
