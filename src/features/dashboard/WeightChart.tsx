// src/features/dashboard/WeightChart.tsx
// Weight over time: raw weigh-ins as recessive dots, EMA trend as the hero
// 2px line. One axis, tight domain, recessive grid, crosshair tooltip.

import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeightEntry } from '@/db/schema';
import { computeEma } from '@/services/weight.svc';
import { CHART, AXIS_TICK, TOOLTIP_STYLES, shortDay } from './chartTheme';

interface WeightChartProps {
  /** Full history (EMA needs it) — the chart windows to entries >= startKey. */
  allWeights: WeightEntry[];
  startKey: string;
  unit: string;
}

export function WeightChart({ allWeights, startKey, unit }: WeightChartProps) {
  // EMA over the FULL history so the trend doesn't reset when the range narrows.
  const smoothed = computeEma(allWeights);
  const data = smoothed.filter(d => d.dayKey >= startKey);

  const latest = data.at(-1);
  const first = data[0];
  const change =
    latest && first ? Math.round((latest.ema - first.ema) * 10) / 10 : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle>Weight</CardTitle>
        {latest && (
          <span className="text-xs text-muted tabular-nums">
            {latest.ema} {unit}
            {change !== undefined && change !== 0 && (
              <> · {change > 0 ? '+' : ''}{change} this period</>
            )}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <p className="text-sm text-muted py-6 text-center">
            Log your weight a few days in a row to see the trend.
          </p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="dayKey"
                  tickFormatter={shortDay}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: CHART.grid }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tickFormatter={(v: number) => String(Math.round(v))}
                />
                <Tooltip
                  {...TOOLTIP_STYLES}
                  formatter={(value, name) => [
                    `${value} ${unit}`,
                    name === 'ema' ? 'Trend' : 'Weigh-in',
                  ]}
                  labelFormatter={label => shortDay(String(label))}
                />
                <Line
                  dataKey="weight"
                  stroke={CHART.muted}
                  strokeWidth={0}
                  dot={{ r: 2.5, fill: CHART.muted, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  name="weight"
                />
                <Line
                  dataKey="ema"
                  stroke={CHART.food}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  name="ema"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-1 flex items-center gap-4 text-xs text-muted" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: 'var(--chart-food)' }} />
            trend
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--muted)' }} />
            weigh-ins
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
