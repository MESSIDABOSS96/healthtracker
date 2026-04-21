// src/features/calendar/StreakCount.tsx
// Hero streak-count block above the month grid. Positive-framed copy per
// UI-SPEC §Streak count component (lines 186-198): today never shown as
// "broken" — if today isn't 4/4 yet, subtitle is "finish today's 4th to
// extend" (forward-looking, anti-Pitfall #6). Instant text swap on change
// (no count-up animation, per anti-motion policy).

import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentStreakCount } from './hooks';
import { getStreakDataForRange } from '@/services/streak.svc';
import { todayKey } from '@/lib/dayKey';

export function StreakCount() {
  const count = useCurrentStreakCount() ?? 0;

  // Dedicated single-day subscription: is today 4/4? Needed to decide whether
  // the "finish today's 4th to extend" subtitle shows. One range query on a
  // single day is O(1) — not Anti-Pattern 3 (that's about per-cell amplification).
  const todaysRow = useLiveQuery(() => {
    const k = todayKey();
    return getStreakDataForRange(k, k);
  }, []);
  const today = todayKey();
  const todayState = todaysRow?.get(today);
  const todayIsComplete =
    !!todayState && todayState.pt && todayState.food && todayState.steps && todayState.lift;

  const suffix = count === 1 ? 'day' : 'days';

  let subtitle: string | null = null;
  if (count === 0) {
    subtitle = 'log all 4 areas today to start a streak';
  } else if (!todayIsComplete) {
    subtitle = "finish today's 4th to extend";
  }
  // else: today IS complete and the streak includes today — no subtitle needed.

  const ariaLabel = `Streak: ${count} ${suffix}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="pt-6 pb-4 flex flex-col items-center"
    >
      <span className="text-xl font-semibold text-text tabular-nums">{count}</span>
      <span className="text-sm text-muted">{suffix}</span>
      {subtitle && (
        <span className="text-xs text-muted mt-1">{subtitle}</span>
      )}
    </div>
  );
}
