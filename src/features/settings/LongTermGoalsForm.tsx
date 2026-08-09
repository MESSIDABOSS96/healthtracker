// src/features/settings/LongTermGoalsForm.tsx
// Long-term goals: target weight (+ optional deadline) and weekly training
// frequency. All fields optional — leaving one blank simply hides that part of
// the Dashboard goal card. Controlled state rather than RHF because "empty
// means unset" is the common case here and numeric RHF fields coerce '' to NaN.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { field, label as labelClass } from '@/components/ui/styles';
import { SettingsCard } from './SettingsCard';
import { getAllWeights, computeEma } from '@/services/weight.svc';
import { getLongTermGoals, saveLongTermGoals } from '@/services/longTermGoals.svc';
import { useGoals } from './hooks';
import { todayKey } from '@/lib/dayKey';

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
  const [saved, setSaved] = useState(false);

  // Re-sync when the stored row resolves (or changes in another tab).
  useEffect(() => {
    if (stored === undefined) return;
    setTargetWeight(stored?.targetWeight != null ? String(stored.targetWeight) : '');
    setTargetDate(stored?.targetDate ?? '');
    setLifts(stored?.liftsPerWeek != null ? String(stored.liftsPerWeek) : '');
    setCardio(stored?.cardioPerWeek != null ? String(stored.cardioPerWeek) : '');
  }, [stored]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentEma = weights && weights.length > 0 ? computeEma(weights).at(-1)?.ema : undefined;
    await saveLongTermGoals(
      {
        targetWeight: numOrUndef(targetWeight),
        targetDate: targetDate || undefined,
        liftsPerWeek: numOrUndef(lifts),
        cardioPerWeek: numOrUndef(cardio),
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
        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
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
              value={cardio}
              onChange={e => setCardio(e.target.value)}
              className={inputClass}
            />
          </div>
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
