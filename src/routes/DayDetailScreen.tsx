// src/routes/DayDetailScreen.tsx
// Past-day detail at /#/day/:dayKey (reached from the Dashboard closure grid
// or deep links). Reuses the Daily-tab leaf components parameterized by dayKey:
// meals (edit/delete), lift/cardio toggles, weight. No backdated freeform
// parsing — library chips cover "forgot to log yesterday" without new parses.

import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { keyToDate, todayKey } from '@/lib/dayKey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckinButtons } from '@/features/checkins/CheckinButtons';
import { MacroSummary } from '@/features/food/MacroSummary';
import { LibraryChips } from '@/features/food/LibraryChips';
import { TodayMealList } from '@/features/food/TodayMealList';
import { WeightCard } from '@/features/weight/WeightCard';

const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayDetailScreen() {
  const { dayKey } = useParams<{ dayKey: string }>();

  if (!dayKey || !DAYKEY_RE.test(dayKey)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (dayKey === todayKey()) {
    return <Navigate to="/daily" replace />;
  }

  const dateLabel = keyToDate(dayKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          className="text-muted p-2 -ml-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold">{dateLabel}</h1>
      </div>

      <CheckinButtons dayKey={dayKey} />

      <Card>
        <CardHeader>
          <CardTitle>Food</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MacroSummary dayKey={dayKey} />
          <LibraryChips dayKey={dayKey} />
          <TodayMealList dayKey={dayKey} />
        </CardContent>
      </Card>

      <WeightCard dayKey={dayKey} />
    </div>
  );
}
