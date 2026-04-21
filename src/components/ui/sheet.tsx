import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui Sheet — Phase 1 placeholder.
 *
 * Per UI-SPEC §"Component Inventory": Sheet is INSTALLED in Phase 1 but NOT
 * RENDERED until Phase 2 introduces logging sheets. This is a minimal scaffold
 * (no Radix dialog primitive yet) so the export contract exists; Phase 2 will
 * upgrade this to a full Radix-backed implementation when first consumed.
 */

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function Sheet({ open, children }: SheetProps) {
  if (!open) return null;
  return <>{children}</>;
}

export const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="dialog"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 bg-surface border-t border-border rounded-t-lg p-4',
        className,
      )}
      {...props}
    />
  ),
);
SheetContent.displayName = 'SheetContent';

export const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button ref={ref} type="button" className={cn(className)} {...props} />
));
SheetTrigger.displayName = 'SheetTrigger';

export const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-base font-semibold text-text', className)} {...props} />
  ),
);
SheetTitle.displayName = 'SheetTitle';
