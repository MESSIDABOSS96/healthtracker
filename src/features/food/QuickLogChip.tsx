// src/features/food/QuickLogChip.tsx
// One-tap re-log affordance per UI-SPEC §"Quick-log chip".
// Optional 20px leading photo thumb via FoodThumb (OPFS-backed).

import { forwardRef } from 'react';
import type { Food } from '@/db/schema';
import { cn } from '@/lib/utils';
import { focusRing, press } from '@/components/ui/styles';
import { FoodThumb } from './FoodThumb';

interface QuickLogChipProps {
  food: Food;
  onLog: (food: Food) => void;
  className?: string;
}

export const QuickLogChip = forwardRef<HTMLButtonElement, QuickLogChipProps>(
  ({ food, onLog, className }, ref) => (
    <button
      type="button"
      ref={ref}
      onClick={() => onLog(food)}
      aria-label={`Log ${food.name}`}
      className={cn(
        'h-10 shrink-0 pl-3.5 pr-4 inline-flex items-center gap-2 rounded-full',
        'border border-hairline bg-surface shadow-contact',
        'text-[13.5px] font-medium text-text whitespace-nowrap',
        '[@media(hover:hover)]:hover:bg-surface-2',
        press,
        // after `press` — see the note in button.tsx on transition merging
        'transition-[background-color,transform] duration-150 ease-out-soft',
        focusRing,
        food.photoKey && 'pl-1.5',
        className,
      )}
    >
      {food.photoKey && <FoodThumb photoKey={food.photoKey} size={28} />}
      <span>{food.name}</span>
    </button>
  ),
);
QuickLogChip.displayName = 'QuickLogChip';
