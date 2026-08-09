// src/features/dashboard/TrainingChart.tsx
// Training consistency: lift + cardio sessions per week, grouped bars.
// Two categorical series → fixed identity colors (same entities as the ring),
// legend present, 2px gaps between bars.

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardMeta, CardTitle } from '@/components/ui/card';
import { CHART, AXIS_TICK, TOOLTIP_STYLES } from './chartTheme';
import { ChartEmpty, ChartLegend } from './ChartLegend';

export interface TrainingWeekDatum {
  weekLabel: string; // e.g. "7/28"
  lift: number; // 0..7
  cardio: number; // 0..7
}

export function TrainingChart({ data }: { data: TrainingWeekDatum[] }) {
  const hasAny = data.some(d => d.lift > 0 || d.cardio > 0);
  const totalSessions = data.reduce((sum, d) => sum + d.lift + d.cardio, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Training</CardTitle>
        {hasAny && <CardMeta>{totalSessions} sessions</CardMeta>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {!hasAny ? (
          <ChartEmpty>Check off lifts and cardio to see weekly consistency.</ChartEmpty>
        ) : (
          <div className="h-40 lg:h-52 lg:h-auto lg:min-h-[13rem] lg:flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -30 }} barGap={2}>
                <CartesianGrid stroke={CHART.grid} strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: CHART.grid }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  domain={[0, 7]}
                  ticks={[0, 7]}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  {...TOOLTIP_STYLES}
                  cursor={{ fill: 'var(--border)', fillOpacity: 0.35 }}
                  formatter={(value, name) => [
                    `${value}× `,
                    name === 'lift' ? 'Lift' : 'Cardio',
                  ]}
                  labelFormatter={label => `Week of ${label}`}
                />
                <Bar dataKey="lift" fill={CHART.lift} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="cardio" fill={CHART.cardio} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {hasAny && (
          <ChartLegend
            items={[
              { label: 'Lift', color: 'var(--chart-lift)' },
              { label: 'Cardio', color: 'var(--chart-cardio)' },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
