// src/features/dashboard/CaloriesChart.tsx
// Eating trend: daily calories as single-hue bars vs a dashed target line.
// Adherence is a text stat (logged days / on-target days), not a bar repaint —
// color follows the entity (calories), not per-day status.

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardMeta, CardTitle } from '@/components/ui/card';
import { CHART, AXIS_TICK, TOOLTIP_STYLES, shortDay } from './chartTheme';
import { ChartEmpty, ChartLegend } from './ChartLegend';

export interface CaloriesDatum {
  dayKey: string;
  calories: number;
}

interface CaloriesChartProps {
  data: CaloriesDatum[]; // one datum per day in range (0 for unlogged days)
  target: number;
  adherenceBand?: number; // fraction, default ±10%
}

export function CaloriesChart({ data, target, adherenceBand = 0.1 }: CaloriesChartProps) {
  const loggedDays = data.filter(d => d.calories > 0);
  const onTarget =
    target > 0
      ? loggedDays.filter(d => Math.abs(d.calories - target) <= target * adherenceBand).length
      : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Eating</CardTitle>
        {loggedDays.length > 0 && (
          <CardMeta>
            {loggedDays.length} logged{target > 0 && <> · {onTarget} on target</>}
          </CardMeta>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {loggedDays.length === 0 ? (
          <ChartEmpty>Log meals and your daily calories will chart here.</ChartEmpty>
        ) : (
          <div className="h-40 lg:h-52 lg:h-auto lg:min-h-[13rem] lg:flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
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
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tickFormatter={(v: number) => String(Math.round(v))}
                />
                <Tooltip
                  {...TOOLTIP_STYLES}
                  cursor={{ fill: 'var(--border)', fillOpacity: 0.35 }}
                  formatter={value => [`${Math.round(Number(value))} cal`, 'Calories']}
                  labelFormatter={label => shortDay(String(label))}
                />
                {target > 0 && (
                  <ReferenceLine
                    y={target}
                    stroke={CHART.faint}
                    strokeDasharray="3 4"
                    strokeOpacity={0.9}
                  />
                )}
                <Bar
                  dataKey="calories"
                  fill={CHART.food}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {target > 0 && loggedDays.length > 0 && (
          <ChartLegend
            items={[
              { label: 'Calories', color: 'var(--chart-food)', shape: 'bar' },
              { label: `Target · ${target.toLocaleString()} cal`, color: 'var(--faint)', shape: 'line' },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
