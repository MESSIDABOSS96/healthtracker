// src/features/day/DayNav.tsx
// Day stepper: ← date → , with a way back to today when you've wandered off.
//
// Forward is disabled on today rather than hidden: a control that vanishes at
// the end of a range makes the arrows jump position as you step through them,
// and you lose the affordance that told you which way you were going.

import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, keyToDate } from '@/lib/dayKey';
import { dayPath } from '@/lib/dayRoutes';
import { focusRing, press } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

interface DayNavProps {
  dayKey: string;
  todayKey: string;
}

export function DayNav({ dayKey, todayKey }: DayNavProps) {
  const navigate = useNavigate();
  const isToday = dayKey === todayKey;
  const date = keyToDate(dayKey);

  const label = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    // Only bother with the year when it isn't the current one.
    ...(date.getFullYear() !== keyToDate(todayKey).getFullYear() ? { year: 'numeric' } : {}),
  });

  const step = (delta: number) => {
    const next = addDays(dayKey, delta);
    if (next > todayKey) return; // no logging the future
    navigate(dayPath(next, todayKey));
  };

  const arrow =
    'grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-150 ease-out-soft [@media(hover:hover)]:hover:bg-track [@media(hover:hover)]:hover:text-text disabled:pointer-events-none disabled:opacity-25';

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous day"
        className={cn(arrow, press, focusRing)}
      >
        <ChevronLeft size={19} />
      </button>

      <div className="min-w-0 text-center">
        <p className="truncate text-[13px] font-medium text-text lg:text-sm">{label}</p>
        {!isToday && (
          <Link
            to="/daily"
            className={`text-[11.5px] font-medium text-accent underline-offset-2 hover:underline ${focusRing}`}
          >
            Back to today
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={isToday}
        aria-label="Next day"
        className={cn(arrow, press, focusRing)}
      >
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
