// src/features/dashboard/TrainingChart.tsx
// Training consistency: lift + cardio sessions per week, grouped bars.
// Two categorical series → fixed identity colors (same entities as the ring),
// legend present, 2px gaps between bars.

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART, AXIS_TICK, TOOLTIP_STYLES } from './chartTheme';

export interface TrainingWeekDatum {
  weekLabel: string; // e.g. "7/28"
  lift: number; // 0..7
  cardio: number; // 0..7
}

export function TrainingChart({ data }: { data: TrainingWeekDatum[] }) {
  const hasAny = data.some(d => d.lift > 0 || d.cardio > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="text-sm text-muted py-6 text-center">
            Check off lifts and cardio to see weekly consistency.
          </p>
        ) : (
          <div className="h-40">
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
        <div className="mt-1 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: 'var(--chart-lift)' }} />
            Lift
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: 'var(--chart-cardio)' }} />
            Cardio
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
