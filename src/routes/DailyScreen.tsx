// src/routes/DailyScreen.tsx
// The Daily tab — today's view. All of the actual screen lives in DayScreen,
// which /day/:dayKey renders too, so stepping between days with the arrows
// never changes what the page looks like.
//
// useDayKey (not todayKey()) so the screen re-renders across midnight.

import { useDayKey } from '@/lib/useDayKey';
import { DayScreen } from '@/features/day/DayScreen';

export function DailyScreen() {
  const todayKey = useDayKey();
  return <DayScreen dayKey={todayKey} todayKey={todayKey} />;
}
