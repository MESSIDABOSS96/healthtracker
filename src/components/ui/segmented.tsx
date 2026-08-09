// src/components/ui/segmented.tsx
// The app's single segmented-control shape: a recessed trough with the active
// option riding on a raised surface. Five screens were each drawing their own
// row of bordered buttons where the selected one turned accent-colored —
// same widget, five looks, and "outlined + green text" reads as a link more
// than as a switch.
//
// Selection is a background/shadow swap, not a sliding thumb: these controls
// are tapped constantly and a travelling indicator would put an animation in
// front of a decision the user already made.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { focusRing } from './styles';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel: string;
  /** Per-option classes — override to change height or stack an icon. */
  itemClassName?: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  itemClassName,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex gap-1 rounded-full border border-hairline bg-surface-2 p-1', className)}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-9 flex-1 rounded-full text-[13px]',
              'transition-[background-color,color,box-shadow] duration-150 ease-out-soft',
              focusRing,
              active ? 'bg-surface font-medium text-text shadow-contact' : 'text-muted',
              itemClassName,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
