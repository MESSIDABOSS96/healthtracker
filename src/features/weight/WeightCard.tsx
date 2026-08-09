// src/features/weight/WeightCard.tsx
// One-number daily weigh-in + smoothed trend readout. Save on blur / Enter.
//
// The input is the biggest type on the card because it's the whole card: the
// interaction is "type one number and leave". The EMA trend sits beside it as
// the quiet reference, since the trend — not today's reading — is the number
// that actually means something day to day.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardMeta, CardTitle } from '@/components/ui/card';
import { focusRing } from '@/components/ui/styles';
import { getWeight, getAllWeights, upsertWeight, computeEma } from '@/services/weight.svc';
import { useGoals } from '@/features/settings/hooks';
import { cn } from '@/lib/utils';

export function WeightCard({ dayKey }: { dayKey: string }) {
  const goals = useGoals();
  const unit = goals?.weightUnit ?? 'lb';
  const entry = useLiveQuery(() => getWeight(dayKey), [dayKey]);
  const all = useLiveQuery(() => getAllWeights(), []);

  const [draft, setDraft] = useState('');
  useEffect(() => {
    setDraft(entry ? String(entry.weight) : '');
  }, [entry?.weight, entry, dayKey]);

  const commit = async () => {
    const value = parseFloat(draft);
    if (Number.isFinite(value) && value > 0 && value !== entry?.weight) {
      await upsertWeight(dayKey, Math.round(value * 10) / 10);
    } else if (!draft && entry) {
      setDraft(String(entry.weight)); // don't delete on accidental clear
    }
  };

  const trend = all && all.length > 0 ? computeEma(all).at(-1)?.ema : undefined;
  const delta =
    entry && trend !== undefined ? Math.round((entry.weight - trend) * 10) / 10 : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scale size={15} className="text-faint" aria-hidden />
          Weight
        </CardTitle>
        {trend !== undefined && (
          <CardMeta>
            trend {trend} {unit}
          </CardMeta>
        )}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="—"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label={`Body weight in ${unit}`}
            className={cn(
              'stat h-14 w-[6.5rem] rounded-md border border-hairline bg-surface-2 px-3',
              'text-[30px] font-semibold leading-none text-text placeholder:font-normal placeholder:text-faint',
              'transition-[border-color] duration-150 ease-out-soft',
              focusRing,
            )}
          />
          <span className="text-sm text-muted">{unit}</span>
        </div>
        {delta !== undefined && delta !== 0 && (
          <span className="stat pb-1 text-xs text-muted">
            {delta > 0 ? '+' : ''}
            {delta} vs trend
          </span>
        )}
      </CardContent>
    </Card>
  );
}
