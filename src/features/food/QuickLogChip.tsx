// src/features/food/QuickLogChip.tsx
// One-tap re-log affordance per UI-SPEC §"Quick-log chip".
// Optional 20px leading photo thumb via FoodThumb (OPFS-backed).
//
// When `onRemove` is supplied the chip becomes a two-control group: the name
// logs, a trailing × dismisses. They can't nest — a <button> inside a <button>
// is invalid and browsers reparent it — so the chip is a wrapper element with
// two siblings inside, and the wrapper carries the rounded shell that used to
// live on the button itself. The × is positioned OUT of flow so the chip keeps
// exactly the dimensions it has without one.
//
// The × only materializes for a real pointer. It's revealed on hover, which a
// touch screen cannot express, and rendering it permanently would put a delete
// target a thumb-width from a log target on every chip in the row — the phone
// keeps the clean shortcut and lets Recent roll over on its own.

import { forwardRef } from 'react';
import { X } from 'lucide-react';
import type { Food } from '@/db/schema';
import { cn } from '@/lib/utils';
import { focusRing, press } from '@/components/ui/styles';
import { FoodThumb } from './FoodThumb';

interface QuickLogChipProps {
  food: Food;
  onLog: (food: Food) => void;
  onRemove?: (food: Food) => void;
  className?: string;
}

const SHELL =
  'h-10 shrink-0 inline-flex items-center rounded-full border border-hairline bg-surface shadow-contact';

export const QuickLogChip = forwardRef<HTMLButtonElement, QuickLogChipProps>(
  ({ food, onLog, onRemove, className }, ref) => {
    const label = (
      <>
        {food.photoKey && <FoodThumb photoKey={food.photoKey} size={28} />}
        <span>{food.name}</span>
      </>
    );

    if (!onRemove) {
      return (
        <button
          type="button"
          ref={ref}
          onClick={() => onLog(food)}
          aria-label={`Log ${food.name}`}
          className={cn(
            SHELL,
            'gap-2 pl-3.5 pr-4 text-[13.5px] font-medium text-text whitespace-nowrap',
            '[@media(hover:hover)]:hover:bg-surface-2',
            press,
            // after `press` — see the note in button.tsx on transition merging
            'transition-[background-color,transform] duration-150 ease-out-soft',
            focusRing,
            food.photoKey && 'pl-1.5',
            className,
          )}
        >
          {label}
        </button>
      );
    }

    return (
      <div
        className={cn(
          SHELL,
          'group/chip relative',
          '[@media(hover:hover)]:hover:bg-surface-2',
          'transition-colors duration-150 ease-out-soft',
          // focus-within so keyboard focus on either control shows the ring the
          // single-button chip gets from `focusRing`.
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
          className,
        )}
      >
        <button
          type="button"
          ref={ref}
          onClick={() => onLog(food)}
          aria-label={`Log ${food.name}`}
          className={cn(
            'flex h-full items-center gap-2 rounded-full pl-3.5 pr-4',
            'text-[13.5px] font-medium text-text whitespace-nowrap',
            press,
            'transition-transform duration-150 ease-out-soft',
            'focus:outline-none',
            food.photoKey && 'pl-1.5',
          )}
        >
          {label}
        </button>

        {/* Absolutely positioned, so it costs the chip no width. In flow it
            padded EVERY chip by its own size the whole time — it renders at
            opacity 0, and a transparent button still occupies its box. Taking
            it out of flow also means no chip changes width on hover, which in a
            horizontally-scrolling row would shove its neighbours sideways under
            the pointer. It rides on the chip's own hovered background so a name
            long enough to reach it is masked rather than crossed out. */}
        <button
          type="button"
          onClick={() => onRemove(food)}
          aria-label={`Remove ${food.name} from shortcuts`}
          className={cn(
            'absolute right-1 top-1/2 hidden h-5 w-5 -translate-y-1/2 place-items-center',
            'rounded-full bg-surface-2 text-faint',
            '[@media(hover:hover)]:grid',
            '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/chip:opacity-100',
            'focus-visible:opacity-100',
            'hover:bg-danger/10 hover:text-danger',
            'transition-[opacity,background-color,color] duration-150 ease-out-soft',
            'focus:outline-none',
          )}
        >
          <X size={12} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    );
  },
);
QuickLogChip.displayName = 'QuickLogChip';
