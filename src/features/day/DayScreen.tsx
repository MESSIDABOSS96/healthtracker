// src/features/day/DayScreen.tsx
// One screen for any day, today or past. `/daily` and `/day/:dayKey` are both
// thin wrappers over this, which is what makes stepping through days with the
// arrows — and clicking a square in the closure grid — land somewhere that
// looks the same every time. They used to be two separately-built screens that
// drifted: only one of them had the ring.
//
// Layout is a single centred column at EVERY width — no desktop split. The ring
// is the thing the app exists for, and putting anything beside it demotes it to
// "one of two things happening at once". Stacking keeps it at the top, alone,
// as the focus, and keeps desktop reading identically to the phone.
//
// The column is capped well below the shell's max width because these are forms
// and lists, not a dashboard — a 1150px-wide weight input would be absurd. The
// Dashboard is where the extra width earns its keep.
//
// Days are reachable three ways that all agree with each other: the arrows, a
// closure-grid square, and a horizontal swipe anywhere on the screen (see
// useDaySwipe). Each hands the direction it travelled to the arriving day so it
// enters from that side — the gesture and the arrow are the same navigation,
// not two features that happen to change the same URL.
//
// Freeform entry used to be today-only, on the theory that the library chips
// covered "forgot to log yesterday" without spending a parse. They don't: a new
// account has an empty library, so a past day offered no way to log food at all
// — the screen said "type what you ate above" above nothing. And three of the
// four resolver tiers have no date in them anyway; 4/4/9 arithmetic and a USDA
// row are the same numbers on Tuesday as they are today. The composer renders
// for every day now.

import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { stepDayPath, type DayNavState } from '@/lib/dayRoutes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClosureRing } from '@/features/closure/ClosureRing';
import { useDayClosure, useClosureStreak } from '@/features/closure/hooks';
import { blankClosure } from '@/services/closure.svc';
import { CheckinButtons } from '@/features/checkins/CheckinButtons';
import { FoodEntry } from '@/features/food/FoodEntry';
import { LibraryChips } from '@/features/food/LibraryChips';
import { MacroSummary } from '@/features/food/MacroSummary';
import { TodayMealList } from '@/features/food/TodayMealList';
import { WeightCard } from '@/features/weight/WeightCard';
import { DayNav } from './DayNav';
import { useDaySwipe } from './useDaySwipe';

interface DayScreenProps {
  dayKey: string;
  todayKey: string;
}

export function DayScreen({ dayKey, todayKey }: DayScreenProps) {
  const isToday = dayKey === todayKey;
  const closure = useDayClosure(dayKey);
  // The streak is a live "right now" fact, so it only belongs on today's view —
  // showing it above a day in March would read as that day's streak.
  const streak = useClosureStreak(todayKey);

  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const swipeRef = useRef<HTMLDivElement>(null);

  const step = useCallback(
    (delta: -1 | 1) => {
      const path = stepDayPath(dayKey, todayKey, delta);
      if (!path) return;
      navigate(path, { state: { dir: delta } satisfies DayNavState });
    },
    [dayKey, todayKey, navigate],
  );
  useDaySwipe(swipeRef, { onStep: step, canGoForward: !isToday });

  // Which way we arrived, read off history state rather than kept in a ref:
  // /daily and /day/:key are separate route components, so today → yesterday
  // remounts this screen and a ref would be empty on the commonest step. Null
  // on a cold load or a deep link, where nothing moved and nothing should
  // animate.
  const dir = (useLocation().state as DayNavState | null)?.dir ?? 0;
  const enter = dir === 0 || reduceMotion ? false : { opacity: 0, x: dir * 22 };

  return (
    <div ref={swipeRef} className="px-4 pb-10 pt-3 lg:px-6 lg:pt-5">
      <motion.div
        key={dayKey}
        initial={enter}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full space-y-5 lg:max-w-2xl lg:space-y-6"
      >
        {/* Hero — the ring, alone, above everything. */}
        <div className="mb-2 lg:mb-3">
          <DayNav dayKey={dayKey} todayKey={todayKey} />
          <div className="mt-5">
            <ClosureRing closure={closure ?? blankClosure()} streak={isToday ? streak : undefined} />
          </div>
        </div>

        <CheckinButtons dayKey={dayKey} cardioDaily={closure?.cardioDaily ?? false} />

        <Card>
          <CardHeader>
            <CardTitle>Nutrition</CardTitle>
          </CardHeader>
          <CardContent>
            <MacroSummary dayKey={dayKey} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <FoodEntry dayKey={dayKey} />
          <LibraryChips dayKey={dayKey} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayMealList dayKey={dayKey} />
          </CardContent>
        </Card>

        <WeightCard dayKey={dayKey} />
      </motion.div>
    </div>
  );
}
