// src/features/pt/PainRating.tsx
//
// 0-5 pain rating radiogroup per UI-SPEC §"Pain rating" (lines 533-543).
// Six 40×40 rounded pills in a horizontal row; selected state swaps border
// + text to --accent with no background change. Tap a selected pill to
// clear (sets value back to undefined) per UI-SPEC "Unselected behavior".
//
// Accessibility: explicit role="radiogroup" + per-pill role="radio" +
// aria-checked + aria-label; label "Pain" sits above the row.

import { cn } from '@/lib/utils';

interface PainRatingProps {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
}

export function PainRating({ value, onChange }: PainRatingProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted">Pain</div>
      <div role="radiogroup" aria-label="Pain rating" className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={String(n)}
              onClick={() => onChange(selected ? undefined : n)}
              className={cn(
                'h-10 w-10 rounded-full border bg-surface text-sm',
                selected ? 'border-accent text-accent' : 'border-border text-text',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
