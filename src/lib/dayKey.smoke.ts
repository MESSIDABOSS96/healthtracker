// src/lib/dayKey.smoke.ts
// Dev-only smoke assertions. Plan 03 imports this once from initApp() under import.meta.env.DEV.
// These are not unit tests — they're an in-process tripwire for Pitfall #4.
import { dateToKey, keyToDate, todayKey } from './dayKey';

export function runDayKeySmoke(): void {
  // === THE CRITICAL CASE ===
  // 11:30pm local time in a western timezone — UTC-based formatting would shift the day forward.
  // This case is ROADMAP.md Phase 1 success criterion #3 explicitly.
  const localApr19_2330 = new Date(2026, 3, 19, 23, 30); // JS months 0-indexed; Apr = 3
  console.assert(
    dateToKey(localApr19_2330) === '2026-04-19',
    `dayKey regression (Pitfall #4): dateToKey(Apr 19 2026 23:30 local) returned ${dateToKey(localApr19_2330)} — expected 2026-04-19`,
  );

  // === ADDITIONAL GUARDS ===
  // Key shape is always zero-padded
  const singleDigit = new Date(2026, 0, 5, 12, 0); // Jan 5, noon local
  console.assert(
    dateToKey(singleDigit) === '2026-01-05',
    `zero-pad regression: ${dateToKey(singleDigit)}`,
  );

  // keyToDate round-trips as local midnight (not UTC midnight)
  const roundTrip = keyToDate('2026-04-19');
  console.assert(
    roundTrip.getFullYear() === 2026 &&
      roundTrip.getMonth() === 3 &&
      roundTrip.getDate() === 19,
    `keyToDate local-midnight regression: got ${roundTrip.toString()}`,
  );

  // todayKey() is defined and shaped YYYY-MM-DD
  console.assert(/^\d{4}-\d{2}-\d{2}$/.test(todayKey()), `todayKey shape: ${todayKey()}`);
}
