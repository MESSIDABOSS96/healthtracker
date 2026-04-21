import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Reusable banner primitive (built on Card).
 *
 * Plan 01-03 consumes this for both the Install banner (D-11) and
 * Eviction-warning banner (D-14). Signature is contract-locked by the
 * <interfaces> block in 01-01 PLAN.
 *
 * Note: UI-SPEC suggests role="banner" for install/eviction landmarks, but
 * applying it here would create duplicate landmarks if multiple banners mount
 * (and conflicts with the AppShell <header>). Phase 1 uses role="region" +
 * aria-label as a conservative default; Plan 01-03's specific banner wrappers
 * may apply more specific roles when wired.
 */
export interface BannerProps {
  title: string;
  body: string;
  variant?: 'default' | 'warning';
  primaryAction?: { label: string; onClick: () => void };
  onDismiss: () => void;
}

export function Banner({
  title,
  body,
  variant = 'default',
  primaryAction,
  onDismiss,
}: BannerProps) {
  return (
    <Card
      role="region"
      aria-label="Safety notice"
      className={cn(
        'bg-surface border border-border rounded-lg p-4',
        variant === 'warning' && 'border-accent/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <p className="text-sm text-muted mt-1">{body}</p>
          {primaryAction && (
            <div className="mt-3">
              <Button variant="default" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="text-muted p-2 -m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
        >
          <X size={20} />
        </button>
      </div>
    </Card>
  );
}
