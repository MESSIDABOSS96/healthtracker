// src/features/settings/hooks.ts
// Reactive wrapper around goals.svc.getGoals(). useLiveQuery re-fires whenever
// any row in the `goals` store is put/deleted — so any consumer (GoalsForm for
// pre-populating field values, and all future macro / step ProgressBars in P3/P5)
// re-renders automatically when Save goals is tapped. This is the mechanism
// behind SET-02.

import { useLiveQuery } from 'dexie-react-hooks';
import { getGoals } from '@/services/goals.svc';

export function useGoals() {
  return useLiveQuery(() => getGoals(), []);
  // Returns `Goals | undefined`. `undefined` means the query is still loading
  // (extremely rare — P1 seeded defaults in initApp() before render). Consumers
  // should treat `undefined` as "render empty state", not as "goals not yet set".
}
