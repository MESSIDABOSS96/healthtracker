// src/routes/DayDetailScreen.tsx
// Any day but today at /#/day/:dayKey — reached from the Dashboard closure
// grid, the day arrows, or a deep link. Renders the same DayScreen as the Daily
// tab, so clicking a square in the grid lands on something identical to what
// you'd see for today rather than a stripped-down variant.
//
// Today redirects to /daily so there is exactly one URL per day.
//
// Future days need no guard of their own: the shape check above is the only
// thing standing between a URL and a day, and a well-formed day key is a day
// the app is willing to open however far out it sits.

import { useParams, Navigate } from 'react-router-dom';
import { useDayKey } from '@/lib/useDayKey';
import { DayScreen } from '@/features/day/DayScreen';

const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayDetailScreen() {
  const { dayKey } = useParams<{ dayKey: string }>();
  const todayKey = useDayKey();

  if (!dayKey || !DAYKEY_RE.test(dayKey)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (dayKey === todayKey) {
    return <Navigate to="/daily" replace />;
  }

  return <DayScreen dayKey={dayKey} todayKey={todayKey} />;
}
