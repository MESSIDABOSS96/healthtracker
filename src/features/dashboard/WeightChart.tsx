// src/features/dashboard/WeightChart.tsx
// Weight over time: raw weigh-ins as recessive dots, EMA trend as the hero
// 2px line. One axis, tight domain, recessive grid, crosshair tooltip.

import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardMeta, CardTitle } from '@/components/ui/card';
import type { WeightEntry } from '@/db/schema';
import { computeEma } from '@/services/weight.svc';
import { CHART, AXIS_TICK, TOOLTIP_STYLES, shortDay } from './chartTheme';
import { ChartEmpty, ChartLegend } from './ChartLegend';

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
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Weight</CardTitle>
        {latest && (
          <CardMeta>
            {latest.ema} {unit}
            {change !== undefined && change !== 0 && (
              <> · {change > 0 ? '+' : ''}{change} this period</>
            )}
          </CardMeta>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {data.length < 2 ? (
          <ChartEmpty>Log your weight a few days in a row to see the trend.</ChartEmpty>
        ) : (
          <div className="h-44 lg:h-56 lg:h-auto lg:min-h-[13rem] lg:flex-1">
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
                  stroke={CHART.faint}
                  strokeWidth={0}
                  dot={{ r: 2.5, fill: CHART.faint, strokeWidth: 0 }}
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
        {data.length >= 2 && (
          <ChartLegend
            items={[
              { label: 'Trend', color: 'var(--chart-food)', shape: 'line' },
              { label: 'Weigh-ins', color: 'var(--faint)', shape: 'dot' },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
