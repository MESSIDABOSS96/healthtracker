import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { focusRing, press } from '@/components/ui/styles';

/**
 * Reusable banner primitive (built on Card).
 *
 * Plan 01-03 consumes this for both the Install banner (D-11) and
 * Eviction-warning banner (D-14). Signature is contract-locked by the
 * <interfaces> block in 01-01 PLAN.
 *
 * The warning variant is a tonal wash rather than a colored outline — a banner
 * about data loss should read as urgent at a glance, and a 1px accent edge on
 * an otherwise identical card doesn't.
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
      className={cn('p-4', variant === 'warning' && 'border-warn/25 bg-warn/10')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.015em] text-text">
            {title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
          {primaryAction && (
            <Button variant="default" size="sm" className="mt-3" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className={`-mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint ${press} ${focusRing}`}
        >
          <X size={17} />
        </button>
      </div>
    </Card>
  );
}
