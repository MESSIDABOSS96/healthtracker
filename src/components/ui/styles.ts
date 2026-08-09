// src/components/ui/styles.ts
// Shared class strings for the handful of treatments that repeat across every
// screen. These are plain strings (not CSS classes) so `cn()`/tailwind-merge
// can still resolve conflicts when a caller overrides one of the utilities.

/** Visible keyboard focus. Offset against the page ground, not the card. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

/**
 * Press feedback for any tappable element. 0.97 is subtle enough to read as
 * "the interface heard you" rather than as an animation, and 140ms ease-out
 * puts the movement in the first frame the user looks at.
 */
export const press =
  'transition-transform duration-140 ease-out-soft active:scale-[0.97] motion-reduce:active:scale-100';

/**
 * Text/number inputs. Inset well (`surface-2`) rather than an outlined box —
 * fields read as recessed into the card instead of stacked on top of it.
 * 44px min height keeps every field a valid touch target.
 */
export const field = [
  'h-11 w-full px-3.5 rounded-md',
  'bg-surface-2 border border-hairline',
  'text-text placeholder:text-faint',
  'transition-[border-color,box-shadow] duration-150 ease-out-soft',
  focusRing,
].join(' ');

/** Section eyebrow. The ONE place uppercase tracking is used — it marks a
 *  structural break, so it stays meaningful instead of decorating every label. */
export const eyebrow = 'text-[11px] font-medium uppercase tracking-[0.08em] text-faint';

/** Ordinary field label — sentence case, quiet, not shouting. */
export const label = 'text-xs font-medium text-muted';
