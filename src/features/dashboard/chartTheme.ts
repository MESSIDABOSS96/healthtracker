// src/features/dashboard/chartTheme.ts
// Shared Recharts theming for the dark surface. Series colors are the
// dark-validated --chart-* tokens; text always wears text tokens (muted ink),
// never a series color.

import type { CSSProperties } from 'react';

export const CHART = {
  food: 'var(--chart-food)',
  lift: 'var(--chart-lift)',
  cardio: 'var(--chart-cardio)',
  grid: 'var(--border)',
  muted: 'var(--muted)',
} as const;

export const AXIS_TICK = { fill: 'var(--muted)', fontSize: 11 } as const;

export const TOOLTIP_STYLES: {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
} = {
  contentStyle: {
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    padding: '6px 10px',
  },
  labelStyle: { color: 'var(--muted)', marginBottom: 2 },
  itemStyle: { color: 'var(--text)', padding: 0 },
};

/** "2026-08-08" → "8/8" for compact axis ticks. */
export function shortDay(dayKey: string): string {
  const [, m, d] = dayKey.split('-');
  return `${Number(m)}/${Number(d)}`;
}
