// src/features/dashboard/GoalProgressCard.tsx
// The long-term benchmark: where you started, where you are, where you're
// headed — plus weekly training frequency against target.
//
// Projections are shown only when the trend genuinely supports one (see
// longTermGoals.svc); otherwise the card says why rather than inventing a date.

import { Link } from 'react-router-dom';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const percent = Math.min(100, (done / target) * 100);
  const met = done >= target;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-12">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-track overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <span className={`text-xs tabular-nums w-12 text-right ${met ? 'text-accent' : 'text-muted'}`}>
        {done}/{target}
      </span>
    </div>
  );
}

export function GoalProgressCard({ goals, progress, unit, thisWeek }: GoalProgressCardProps) {
  const hasFrequencyGoals = !!(goals?.liftsPerWeek || goals?.cardioPerWeek);
  const hasAnyGoal = !!progress || hasFrequencyGoals;

  if (!hasAnyGoal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={16} className="text-muted" aria-hidden />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Set a goal weight or weekly training targets in{' '}
            <Link to="/settings" className="text-accent underline underline-offset-2">
              Settings
            </Link>{' '}
            to benchmark your progress here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Target size={16} className="text-muted" aria-hidden />
          Goals
        </CardTitle>
        {progress?.onTrack !== null && progress?.onTrack !== undefined && goals?.targetDate && (
          <span
            className="text-xs rounded-full px-2 py-0.5"
            style={{
              color: progress.onTrack ? 'var(--accent)' : 'var(--warn)',
              backgroundColor: progress.onTrack ? 'var(--accent-25)' : 'transparent',
              border: progress.onTrack ? 'none' : '1px solid var(--warn)',
            }}
          >
            {progress.onTrack ? 'On pace' : 'Behind pace'}
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {progress && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text">
                {progress.reached ? (
                  <span className="text-accent font-medium">Goal reached 🎉</span>
                ) : (
                  <>
                    <span className="tabular-nums font-medium">{round1(progress.remaining)}</span>{' '}
                    <span className="text-muted">{unit} to go</span>
                  </>
                )}
              </span>
              <span className="text-xs text-muted tabular-nums">
                {Math.round(progress.percent)}%
              </span>
            </div>

            <div className="relative h-2.5 rounded-full bg-track overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted tabular-nums">
              <span>{round1(progress.startWeight)} {unit}</span>
              <span className="text-text">{round1(progress.currentWeight)} {unit}</span>
              <span>{round1(progress.targetWeight)} {unit}</span>
            </div>

            <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
              {progress.ratePerWeek !== null && (
                <>
                  {progress.ratePerWeek < 0 ? (
                    <TrendingDown size={13} aria-hidden />
                  ) : (
                    <TrendingUp size={13} aria-hidden />
                  )}
                  <span className="tabular-nums">
                    {progress.ratePerWeek > 0 ? '+' : ''}
                    {round1(progress.ratePerWeek)} {unit}/week
                  </span>
                </>
              )}
              {progress.projectedDayKey && (
                <span>· on pace for {formatDate(progress.projectedDayKey)}</span>
              )}
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
          <div className="space-y-2">
            {progress && <div className="border-t border-border pt-3" />}
            <p className="text-xs text-muted uppercase tracking-wide">This week</p>
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
