import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { focusRing, press } from './styles';

/**
 * Button.
 *
 * Every variant presses (scale 0.97, 140ms ease-out) — the feedback is what
 * makes a tap feel received. Hover tints are gated behind a fine-pointer query
 * so a touch tap doesn't leave a stuck hover state behind it.
 */
const buttonVariants = cva(
  [
    // Capsule, not a rounded rect — iOS's current control language, and it
    // reads as a button at any width without needing a border.
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full',
    'text-sm font-medium select-none',
    'disabled:pointer-events-none disabled:opacity-40',
    press,
    // Declared AFTER `press` on purpose: both set a `transition-*` shorthand
    // and tailwind-merge keeps the last one, so this has to be the superset
    // (press alone would transition transform and freeze the color changes).
    'transition-[background-color,color,border-color,opacity,transform,filter] duration-150 ease-out-soft',
    focusRing,
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-accent-solid text-on-accent shadow-contact [@media(hover:hover)]:hover:brightness-110',
        outline: 'border border-border bg-surface text-text [@media(hover:hover)]:hover:bg-surface-2',
        ghost: 'text-muted [@media(hover:hover)]:hover:bg-track [@media(hover:hover)]:hover:text-text',
        danger: 'text-danger [@media(hover:hover)]:hover:bg-danger/10',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 px-3.5 text-[13px]',
        lg: 'h-12 px-8 text-[15px]',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
