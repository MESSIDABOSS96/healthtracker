// src/lib/useDayKey.ts
// Reactive today's dayKey — re-renders consumers when local midnight passes.
// Closes Phase 3 review items WR-01 (streak count staleness) and WR-02
// (today-quadrant state staleness) per Phase 4 D-05.
//
// Pitfall #4 (CLAUDE.md rule #3): NEVER construct dayKey via
// `new Date().toISOString().split('T')[0]` — that returns UTC date and shifts
// days for western timezones at night. Delegates to lib/dayKey.ts:todayKey().
//
// RESEARCH Pattern 4 + §Pitfall 3: dep array is [key], NOT []. Each tick
// triggers a fresh effect run which computes msUntilMidnight() from the NEW
// "now" and schedules the NEXT midnight. Using [] would freeze the schedule
// to the first mount.
//
// DST: next.setHours(24, 0, 5, 0) on a local-tz Date correctly accounts for
// DST transitions (JS Date does the tz-aware arithmetic when setting hours).
//
// Background-tab throttling: mobile Safari throttles setTimeout to ~1s minimum
// when backgrounded. On tab foreground, any pending late fire runs a few
// seconds after foregrounding, which is fine — user doesn't see stale state.
//
// Consumer scale: expected 2-3 simultaneous consumers (StreakCount +
// useCurrentStreakCount + useTodayQuadrantState). No shared singleton needed.

import { useEffect, useState } from 'react';
import { todayKey } from '@/lib/dayKey';

function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 5, 0); // tomorrow 00:00:05 local — 5s grace past midnight
  return next.getTime() - now.getTime();
}

export function useDayKey(): string {
  const [key, setKey] = useState<string>(() => todayKey());

  useEffect(() => {
    const timer = setTimeout(() => {
      setKey(todayKey());
    }, msUntilMidnight());
    return () => clearTimeout(timer);
  }, [key]);

  return key;
}
