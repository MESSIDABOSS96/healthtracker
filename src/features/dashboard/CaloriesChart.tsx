// src/features/dashboard/CaloriesChart.tsx
// Eating trend: daily calories as single-hue bars vs a dashed target line.
// Adherence is a text stat (logged days / on-target days), not a bar repaint —
// color follows the entity (calories), not per-day status.

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART, AXIS_TICK, TOOLTIP_STYLES, shortDay } from './chartTheme';

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
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle>Eating</CardTitle>
        {loggedDays.length > 0 && (
          <span className="text-xs text-muted tabular-nums">
            {loggedDays.length} logged{target > 0 && <> · {onTarget} on target</>}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loggedDays.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            Log meals and your daily calories will chart here.
          </p>
        ) : (
          <div className="h-40">
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
                    stroke={CHART.muted}
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
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
        {target > 0 && (
          <p className="mt-1 text-xs text-muted" aria-hidden>
            dashed line = {target} cal target
          </p>
        )}
      </CardContent>
    </Card>
  );
}
