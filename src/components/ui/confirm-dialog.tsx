// src/components/ui/confirm-dialog.tsx
// Generic destructive-confirm primitive. Second consumer of @radix-ui/react-dialog
// (via the bundled `radix-ui` metapackage — same primitive Sheet uses).
//
// Phase 4 D-06: Wired into DayDetail Lift row delete, closing Phase 3 WR-03.
// The primitive is intentionally generic — future destructive flows post-v1
// (meal-entry bulk delete, food-library delete, etc.) can reuse it without
// edits here.
//
// API surface (per RESEARCH Open Q #2 recommendation): controlled
// open/onOpenChange matching Sheet. Parent state owns open; no imperative
// confirm() Promise wrapper.
//
// Accessibility: Radix Dialog handles focus trap, ESC-to-close, click-outside,
// focus-return, aria-modal, aria-labelledby (via Title), aria-describedby (via
// Description). No manual ARIA needed. [CITED: radix-ui.com/primitives/docs/components/dialog]
//
// Radix AlertDialog vs Dialog: AlertDialog is the semantic match for destructive
// confirms (role="alertdialog", disables click-outside-close). We use Dialog for
// Phase 4 parity with Sheet (single-use-site, zero new imports). Migrate to
// AlertDialog post-v1 if 2+ destructive-confirm sites appear (RESEARCH Open Q #2).
//
// Destructive styling: inline #ef4444 / #fafafa hex — matches 4+ existing call
// sites (DayDetail.tsx delete buttons, MealEntryRow.tsx, GoalsForm.tsx errors).
// A future `--destructive` token migration is tracked in Phase 2 IN-05; out of
// Phase 4 scope per CONTEXT.md D-08 hard scope ceiling.

import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-surface p-4 shadow-lg',
            'focus:outline-none',
          )}
        >
          <DialogPrimitive.Title className="text-base font-semibold text-text">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted">
            {body}
          </DialogPrimitive.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              style={destructive ? { backgroundColor: '#ef4444', color: '#fafafa' } : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
