// src/features/food/QuickLogChip.tsx
// 40px rounded pill chip — one-tap log affordance per UI-SPEC §"Quick-log chip".
// Optional 20px leading photo thumb via FoodThumb (OPFS-backed).

import { forwardRef } from 'react';
import type { Food } from '@/db/schema';
import { cn } from '@/lib/utils';
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
        'h-10 px-3 inline-flex items-center gap-2 rounded-full bg-surface border border-border text-text text-sm whitespace-nowrap hover:bg-border/40 active:bg-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        className,
      )}
    >
      {food.photoKey && <FoodThumb photoKey={food.photoKey} size={20} />}
      <span>{food.name}</span>
    </button>
  ),
);
QuickLogChip.displayName = 'QuickLogChip';
