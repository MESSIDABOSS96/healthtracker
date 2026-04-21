// src/routes/DayDetailScreen.tsx
// Route shell mounted at /#/day/:dayKey. Validates the dayKey route param
// (regex format check) and falls through to /calendar on invalid. The format
// check is defensive — valid-but-nonexistent dayKeys (e.g. 2099-12-31 or
// 2020-01-01 with no logs) render the empty-state version of <DayDetail>,
// which is correct per UI-SPEC:303.

import { useParams, Navigate } from 'react-router-dom';
import { DayDetail } from '@/features/calendar/DayDetail';

// D-01..D-04 all construct keys via dateToKey which outputs strict zero-padded
// YYYY-MM-DD — validate the same shape here so a hand-crafted URL with a typo
// (`2026-4-21`) or garbage (`../secret`) redirects out rather than rendering.
const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayDetailScreen() {
  const { dayKey } = useParams<{ dayKey: string }>();

  if (!dayKey || !DAYKEY_RE.test(dayKey)) {
    return <Navigate to="/calendar" replace />;
  }

  return (
    <div className="px-4 py-6">
      <DayDetail dayKey={dayKey} />
    </div>
  );
}
