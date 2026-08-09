// src/components/ui/meter.tsx
// The one progress-fill primitive: a rounded track with a rounded fill.
// Callers own the labels and the layout around it, which is why this replaced
// the old label-plus-bar ProgressBar — the macro summary, the goal card and
// the weekly-frequency rows all want the same bar in three different frames.
//
// Overfill is clamped at 100% but flagged via `over`, so a caller can tint the
// fill instead of silently drawing a full bar for 3,000 of 2,200 calories.

import { cn } from '@/lib/utils';

interface MeterProps {
  value: number;
  max: number;
  /** Any CSS color; defaults to the accent. Pass a token, never a literal. */
  color?: string;
  /** Track thickness in px. 6 for supporting rows, 8–10 for a headline bar. */
  size?: number;
  ariaLabel?: string;
  className?: string;
}

export function Meter({
  value,
  max,
  color = 'var(--accent)',
  size = 6,
  ariaLabel,
  className,
}: MeterProps) {
  const ratio = max > 0 ? value / max : 0;
  const percent = Math.min(100, Math.max(0, ratio * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
      className={cn('relative w-full overflow-hidden rounded-full bg-track', className)}
      style={{ height: size }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out-soft motion-reduce:transition-none"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}
