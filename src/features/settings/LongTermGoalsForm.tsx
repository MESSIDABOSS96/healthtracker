// src/features/settings/LongTermGoalsForm.tsx
// Long-term goals: target weight (+ optional deadline) and weekly training
// frequency. All fields optional — leaving one blank simply hides that part of
// the Dashboard goal card. Controlled state rather than RHF because "empty
// means unset" is the common case here and numeric RHF fields coerce '' to NaN.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, label as labelClass } from '@/components/ui/styles';
import { SettingsCard } from './SettingsCard';
import type { WeightDirection } from '@/db/schema';
import { getAllWeights, computeEma } from '@/services/weight.svc';
import { getLongTermGoals, saveLongTermGoals } from '@/services/longTermGoals.svc';
import { resolveWeightDirection } from '@/lib/closureMath';
import { useGoals } from './hooks';
import { todayKey } from '@/lib/dayKey';

/** 'auto' is the absence of an override, not a fourth stored value. */
type DirectionChoice = 'auto' | WeightDirection;

/** Cardio as a weekly count vs. as something that happens every day. */
type CardioCadence = 'weekly' | 'daily';

const CADENCE_OPTIONS: Array<{ value: CardioCadence; label: string }> = [
  { value: 'weekly', label: 'Some days' },
  { value: 'daily', label: 'Every day' },
];

const CADENCE_COPY: Record<CardioCadence, string> = {
  weekly: 'a rest day covers both — mark one and training is done for the day',
  daily: 'a rest day covers the lift only — the training ring still waits on cardio',
};

const DIRECTION_OPTIONS: Array<{ value: DirectionChoice; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'lose', label: 'Cut' },
  { value: 'maintain', label: 'Hold' },
  { value: 'gain', label: 'Bulk' },
];

const DIRECTION_COPY: Record<WeightDirection, string> = {
  lose: 'a ceiling — the calorie ring fills when you finish at or under it',
  maintain: 'a band — the calorie ring fills within 10% either side of it',
  gain: 'a floor — the calorie ring fills when you finish at or over it',
};

const numOrUndef = (s: string): number | undefined => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function LongTermGoalsForm() {
  const goals = useGoals();
  const unit = goals?.weightUnit ?? 'lb';
  const stored = useLiveQuery(() => getLongTermGoals(), []);
  const weights = useLiveQuery(() => getAllWeights(), []);

  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [lifts, setLifts] = useState('');
  const [cardio, setCardio] = useState('');
  const [cadence, setCadence] = useState<CardioCadence>('weekly');
  const [direction, setDirection] = useState<DirectionChoice>('auto');
  const [saved, setSaved] = useState(false);

  // Re-sync when the stored row resolves (or changes in another tab).
  useEffect(() => {
    if (stored === undefined) return;
    setTargetWeight(stored?.targetWeight != null ? String(stored.targetWeight) : '');
    setTargetDate(stored?.targetDate ?? '');
    setLifts(stored?.liftsPerWeek != null ? String(stored.liftsPerWeek) : '');
    setCardio(stored?.cardioPerWeek != null ? String(stored.cardioPerWeek) : '');
    setCadence(stored?.cardioDaily ? 'daily' : 'weekly');
    setDirection(stored?.directionOverride ?? 'auto');
  }, [stored]);

  // What the closure ring will actually use. On 'auto' this previews the
  // derivation live against the goal weight being typed, so choosing Auto
  // never leaves you guessing which way it resolved.
  const effectiveDirection: WeightDirection =
    direction === 'auto'
      ? resolveWeightDirection({
          startWeight: stored?.startWeight,
          targetWeight: numOrUndef(targetWeight),
          directionOverride: undefined,
        })
      : direction;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentEma = weights && weights.length > 0 ? computeEma(weights).at(-1)?.ema : undefined;
    await saveLongTermGoals(
      {
        targetWeight: numOrUndef(targetWeight),
        targetDate: targetDate || undefined,
        liftsPerWeek: numOrUndef(lifts),
        // Daily cardio IS a weekly target of 7 — writing it keeps the Dashboard's
        // weekly bar measuring against what the user actually signed up for,
        // instead of leaving it blank or stuck at an older, smaller number.
        cardioPerWeek: cadence === 'daily' ? 7 : numOrUndef(cardio),
        cardioDaily: cadence === 'daily' ? true : undefined,
        directionOverride: direction === 'auto' ? undefined : direction,
      },
      currentEma,
      todayKey(),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = `${field} stat`;

  return (
    <SettingsCard
      title="Long-term goals"
      icon={Target}
      description="What you're working toward. Progress against these shows on the Dashboard."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div className="space-y-1.5">
            <label htmlFor="ltg-weight" className={`block ${labelClass}`}>
              Goal weight ({unit})
            </label>
            <input
              id="ltg-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="—"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ltg-date" className={`block ${labelClass}`}>
              Target date
            </label>
            <input
              id="ltg-date"
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div className="space-y-1.5">
            <label htmlFor="ltg-lifts" className={`block ${labelClass}`}>
              Lifts / week
            </label>
            <input
              id="ltg-lifts"
              type="number"
              inputMode="numeric"
              min="0"
              max="7"
              placeholder="—"
              value={lifts}
              onChange={e => setLifts(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ltg-cardio" className={`block ${labelClass}`}>
              Cardio / week
            </label>
            <input
              id="ltg-cardio"
              type="number"
              inputMode="numeric"
              min="0"
              max="7"
              placeholder="—"
              // Daily cardio already answers this field, so it shows the answer
              // rather than going blank — a disabled input with 7 in it says
              // "decided", an empty one says "you forgot something".
              value={cadence === 'daily' ? '7' : cardio}
              disabled={cadence === 'daily'}
              onChange={e => setCardio(e.target.value)}
              className={`${inputClass} disabled:text-muted disabled:opacity-70`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={`block ${labelClass}`}>Cardio days</span>
          <Segmented
            value={cadence}
            onChange={setCadence}
            options={CADENCE_OPTIONS}
            ariaLabel="Cardio cadence"
          />
          <p className="text-xs leading-relaxed text-faint">
            Cardio {cadence === 'daily' ? 'happens every day' : 'happens on some days'} —{' '}
            {CADENCE_COPY[cadence]}.
          </p>
        </div>

        <div className="space-y-1.5">
          <span className={`block ${labelClass}`}>Direction</span>
          <Segmented
            value={direction}
            onChange={setDirection}
            options={DIRECTION_OPTIONS}
            ariaLabel="Weight direction"
          />
          <p className="text-xs leading-relaxed text-faint">
            {direction === 'auto' ? 'From your goal weight: ' : 'Your calorie goal is '}
            {direction === 'auto' && (
              <span className="font-medium text-muted">
                {DIRECTION_OPTIONS.find(o => o.value === effectiveDirection)?.label.toLowerCase()}
              </span>
            )}
            {direction === 'auto' ? ' — ' : ''}
            {DIRECTION_COPY[effectiveDirection]}.
          </p>
        </div>

        {stored?.startWeight != null && stored?.targetWeight != null && (
          <p className="text-xs text-faint">
            Measuring from <span className="stat">{stored.startWeight} {unit}</span>
            {stored.startDayKey ? ` (set ${stored.startDayKey})` : ''}.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="default" className="flex-1">
            Save goals
          </Button>
          {saved && <span className="text-xs font-medium text-accent">Saved</span>}
        </div>
      </form>
    </SettingsCard>
  );
}
