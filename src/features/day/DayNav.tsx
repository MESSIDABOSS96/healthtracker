// src/features/day/DayNav.tsx
// Day stepper: ← date → , with a way back to today when you've wandered off.
//
// Forward is disabled at the end of the range rather than hidden: a control
// that vanishes makes the arrows jump position as you step through them, and
// you lose the affordance that told you which way you were going.
//
// That end is no longer today — it's the planning horizon, because tomorrow's
// food is something people know before they eat it. A future day says so under
// the date: an unlogged day that looks exactly like a missed one is the one
// reading this screen must never allow.

import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { keyToDate } from '@/lib/dayKey';
import { isFutureDay, stepDayPath, type DayNavState } from '@/lib/dayRoutes';
import { focusRing, press } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

interface DayNavProps {
  dayKey: string;
  todayKey: string;
}

export function DayNav({ dayKey, todayKey }: DayNavProps) {
  const navigate = useNavigate();
  const isToday = dayKey === todayKey;
  const isFuture = isFutureDay(dayKey, todayKey);
  const forwardPath = stepDayPath(dayKey, todayKey, 1);
  const date = keyToDate(dayKey);

  const label = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    // Only bother with the year when it isn't the current one.
    ...(date.getFullYear() !== keyToDate(todayKey).getFullYear() ? { year: 'numeric' } : {}),
  });

  // The arrows and the swipe gesture take the same route through stepDayPath,
  // and both hand the direction to the arriving screen so it enters from the
  // side it came from — an arrow tap and a drag should not land differently.
  const step = (delta: -1 | 1) => {
    const path = stepDayPath(dayKey, todayKey, delta);
    if (!path) return; // no logging the future
    navigate(path, { state: { dir: delta } satisfies DayNavState });
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
          <p className="text-[11.5px] leading-tight">
            {isFuture && <span className="text-muted">Planning ahead · </span>}
            <Link
              to="/daily"
              className={`font-medium text-accent underline-offset-2 hover:underline ${focusRing}`}
            >
              Back to today
            </Link>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={forwardPath === null}
        aria-label="Next day"
        className={cn(arrow, press, focusRing)}
      >
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
