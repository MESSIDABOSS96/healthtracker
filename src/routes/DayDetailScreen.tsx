// src/routes/DayDetailScreen.tsx
// Any day but today at /#/day/:dayKey — reached from the Dashboard closure
// grid, the day arrows, or a deep link. Renders the same DayScreen as the Daily
// tab, so clicking a square in the grid lands on something identical to what
// you'd see for today rather than a stripped-down variant.
//
// Today redirects to /daily so there is exactly one URL per day.
//
// Forward days are allowed up to the planning horizon and no further. The check
// is here as well as on the arrows because a URL is not a button: the arrows
// stop at the horizon, but /day/2031-01-01 is one typo (or one stale bookmark
// after midnight) away, and a day beyond it has no route back except the
// browser's own.

import { useParams, Navigate } from 'react-router-dom';
import { useDayKey } from '@/lib/useDayKey';
import { isReachableDay } from '@/lib/dayRoutes';
import { DayScreen } from '@/features/day/DayScreen';

const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayDetailScreen() {
  const { dayKey } = useParams<{ dayKey: string }>();
  const todayKey = useDayKey();

  if (!dayKey || !DAYKEY_RE.test(dayKey)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (dayKey === todayKey || !isReachableDay(dayKey, todayKey)) {
    return <Navigate to="/daily" replace />;
  }

  return <DayScreen dayKey={dayKey} todayKey={todayKey} />;
}
