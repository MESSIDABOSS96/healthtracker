// src/features/dashboard/GoalProgressCard.tsx
// The long-term benchmark: where you started, where you are, where you're
// headed — plus weekly training frequency against target.
//
// The headline is the distance left, because that's the number the goal is
// about; the start/now/goal figures underneath are the scale it's measured on
// and now carry labels, since three bare numbers in a row don't say which is
// which.
//
// Projections are shown only when the trend genuinely supports one (see
// longTermGoals.svc); otherwise the card says why rather than inventing a date.

import { Link } from 'react-router-dom';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Meter } from '@/components/ui/meter';
import { eyebrow } from '@/components/ui/styles';
import type { LongTermGoals } from '@/db/schema';
import type { WeightGoalProgress } from '@/services/longTermGoals.svc';
import { keyToDate } from '@/lib/dayKey';

function formatDate(dayKey: string): string {
  return keyToDate(dayKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface GoalProgressCardProps {
  goals: LongTermGoals | undefined;
  progress: WeightGoalProgress | null;
  unit: string;
  /** Completed sessions in the current week. */
  thisWeek: { lift: number; cardio: number };
}

function FrequencyRow({
  label,
  done,
  target,
  color,
}: {
  label: string;
  done: number;
  target: number;
  color: string;
}) {
  const met = done >= target;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs text-muted">{label}</span>
      <Meter value={done} max={target} color={color} ariaLabel={`${label} sessions this week`} />
      <span
        className={`stat w-10 shrink-0 text-right text-xs font-medium ${met ? 'text-accent' : 'text-muted'}`}
      >
        {done}/{target}
      </span>
    </div>
  );
}

/** start / now / goal readout under the progress bar — each sits over the end
 *  of the bar it describes, so the three numbers read as a scale, not a list. */
function Milestone({
  value,
  unit,
  label,
  align,
  strong,
}: {
  value: number;
  unit: string;
  label: string;
  align: 'left' | 'center' | 'right';
  strong?: boolean;
}) {
  return (
    <div className={align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}>
      <p className={`stat text-[13px] ${strong ? 'font-semibold text-text' : 'text-muted'}`}>
        {round1(value)} {unit}
      </p>
      <p className="mt-0.5 text-[10.5px] text-faint">{label}</p>
    </div>
  );
}

export function GoalProgressCard({ goals, progress, unit, thisWeek }: GoalProgressCardProps) {
  const hasFrequencyGoals = !!(goals?.liftsPerWeek || goals?.cardioPerWeek);
  const hasAnyGoal = !!progress || hasFrequencyGoals;

  if (!hasAnyGoal) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={15} className="text-faint" aria-hidden />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center">
          <p className="text-[13px] leading-relaxed text-muted">
            Set a goal weight or weekly training targets in{' '}
            <Link to="/settings" className="font-medium text-accent underline underline-offset-2">
              Settings
            </Link>{' '}
            to benchmark your progress here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const showPace =
    progress?.onTrack !== null && progress?.onTrack !== undefined && !!goals?.targetDate;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target size={15} className="text-faint" aria-hidden />
          Goals
        </CardTitle>
        {showPace && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={
              progress.onTrack
                ? { color: 'var(--accent)', backgroundColor: 'var(--accent-wash)' }
                : { color: 'var(--warn)', backgroundColor: 'color-mix(in srgb, var(--warn) 12%, transparent)' }
            }
          >
            {progress.onTrack ? 'On pace' : 'Behind pace'}
          </span>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {progress && (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              {progress.reached ? (
                <span className="font-display text-[17px] font-semibold text-accent">
                  Goal reached
                </span>
              ) : (
                <span className="flex items-baseline gap-1.5">
                  <span className="stat text-[26px] leading-none font-semibold text-text">
                    {round1(progress.remaining)}
                  </span>
                  <span className="text-[13px] text-muted">{unit} to go</span>
                </span>
              )}
              <span className="stat text-xs text-muted">{Math.round(progress.percent)}%</span>
            </div>

            <Meter
              value={progress.percent}
              max={100}
              size={8}
              ariaLabel="Weight goal progress"
              className="mt-3"
            />

            <div className="mt-2.5 grid grid-cols-3">
              <Milestone value={progress.startWeight} unit={unit} label="Start" align="left" />
              <Milestone value={progress.currentWeight} unit={unit} label="Now" align="center" strong />
              <Milestone value={progress.targetWeight} unit={unit} label="Goal" align="right" />
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
              {progress.ratePerWeek !== null && (
                <>
                  {progress.ratePerWeek < 0 ? (
                    <TrendingDown size={13} aria-hidden />
                  ) : (
                    <TrendingUp size={13} aria-hidden />
                  )}
                  <span className="stat">
                    {progress.ratePerWeek > 0 ? '+' : ''}
                    {round1(progress.ratePerWeek)} {unit}/week
                  </span>
                </>
              )}
              {progress.projectedDayKey && <span>· on pace for {formatDate(progress.projectedDayKey)}</span>}
              {goals?.targetDate && <span>· target {formatDate(goals.targetDate)}</span>}
              {!progress.reached && progress.ratePerWeek === null && (
                <span>Keep weighing in to see your rate.</span>
              )}
              {!progress.reached && progress.movingAway && (
                <span style={{ color: 'var(--warn)' }}>· trending away from your goal</span>
              )}
            </p>
          </div>
        )}

        {hasFrequencyGoals && (
          <div className={progress ? 'space-y-2.5 border-t border-hairline pt-4' : 'space-y-2.5'}>
            <p className={eyebrow}>This week</p>
            {goals?.liftsPerWeek ? (
              <FrequencyRow
                label="Lift"
                done={thisWeek.lift}
                target={goals.liftsPerWeek}
                color="var(--ring-lift)"
              />
            ) : null}
            {goals?.cardioPerWeek ? (
              <FrequencyRow
                label="Cardio"
                done={thisWeek.cardio}
                target={goals.cardioPerWeek}
                color="var(--ring-cardio)"
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
