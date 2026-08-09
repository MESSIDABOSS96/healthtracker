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
  faint: 'var(--faint)',
} as const;

/** Axis ticks are reference furniture, not content — they sit at the faintest
 *  legible step so the series reads first. */
export const AXIS_TICK = {
  fill: 'var(--faint)',
  fontSize: 10.5,
  fontFamily: 'var(--font-display)',
} as const;

/** Tooltips float above the card, so they get the raised shadow and the
 *  surface color rather than a boxed outline on the page ground. */
export const TOOLTIP_STYLES: {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
} = {
  contentStyle: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--r-sm)',
    boxShadow: 'var(--shadow-lg)',
    fontSize: 12,
    padding: '8px 11px',
    fontFamily: 'var(--font-display)',
  },
  labelStyle: { color: 'var(--faint)', marginBottom: 3, fontWeight: 500 },
  itemStyle: { color: 'var(--text)', padding: 0, fontWeight: 600 },
};

/** "2026-08-08" → "8/8" for compact axis ticks. */
export function shortDay(dayKey: string): string {
  const [, m, d] = dayKey.split('-');
  return `${Number(m)}/${Number(d)}`;
}
