// src/features/weight/WeightCard.tsx
// One-number daily weigh-in + smoothed trend readout. Save on blur / Enter.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWeight, getAllWeights, upsertWeight, computeEma } from '@/services/weight.svc';
import { useGoals } from '@/features/settings/hooks';

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
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Scale size={16} className="text-muted" aria-hidden />
          Weight
        </CardTitle>
        {trend !== undefined && (
          <span className="text-xs text-muted tabular-nums">
            trend {trend} {unit}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex items-center gap-3">
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
          className="w-28 h-11 px-3 rounded-md bg-bg border border-border text-text text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
        <span className="text-sm text-muted">{unit}</span>
        {delta !== undefined && delta !== 0 && (
          <span className="ml-auto text-xs text-muted tabular-nums">
            {delta > 0 ? '+' : ''}
            {delta} vs trend
          </span>
        )}
      </CardContent>
    </Card>
  );
}
