// src/features/calendar/StreakCount.tsx
// Hero streak-count block above the month grid. Positive-framed copy per
// UI-SPEC §Streak count component (lines 186-198): today never shown as
// "broken" — if today isn't 4/4 yet, subtitle is "finish today's 4th to
// extend" (forward-looking, anti-Pitfall #6). Instant text swap on change
// (no count-up animation, per anti-motion policy).
//
// Phase 4 D-05: today's quadrant state comes from useTodayQuadrantState()
// (which internally uses useDayKey() for midnight-rollover reactivity).
// Closes Phase 3 WR-02 — no more stale 4/4 check after local midnight.

import { useCurrentStreakCount, useTodayQuadrantState } from './hooks';

export function StreakCount() {
  const count = useCurrentStreakCount() ?? 0;
  const todayState = useTodayQuadrantState();
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
