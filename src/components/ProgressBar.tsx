// src/components/ProgressBar.tsx
// UI-SPEC §"Progress bar component": 8px height, rounded-full, bg-white/[0.08] track, bg-accent fill.
// D-16 zero-target sentinel: when max === 0, render consumed-only, no bar in DOM.
// Fill width updates instantly — no CSS tween property (anti-motion policy per UI-SPEC §"Interaction & Motion").

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export function ProgressBar({ value, max, label, ariaLabel, className }: ProgressBarProps) {
  // D-16 zero-target sentinel.
  if (max === 0) {
    return (
      <div className={cn('flex items-baseline gap-2', className)}>
        {label && <span className="text-xs text-muted w-6">{label}</span>}
        <span className="text-sm text-text tabular-nums">{value}</span>
      </div>
    );
  }

  const percent = Math.min(100, (value / max) * 100);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-xs text-muted w-6">{label}</span>}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel ?? `${label ?? ''} progress`.trim()}
        className="relative h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
