import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — the app's one container primitive.
 *
 * Depth, not outline. A card is a white (or lifted-zinc) surface sitting on a
 * tinted ground with a soft shadow and a hairline edge, instead of a 1px box
 * drawn on the same color as its surroundings. The hairline is nearly
 * invisible in light mode (it just resolves the edge against the shadow) and
 * carries most of the separation in dark mode, where shadows can't.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-hairline bg-surface text-text shadow-card',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 px-4 pt-4 pb-3 lg:px-5 lg:pt-5 lg:pb-3.5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'font-display text-[15px] font-semibold tracking-[-0.015em] leading-tight text-text',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

/** The small right-hand readout in a card header (trend, count, streak). */
export const CardMeta = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn('text-xs text-muted stat', className)} {...props} />
  ),
);
CardMeta.displayName = 'CardMeta';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-4 pb-4 lg:px-5 lg:pb-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';
