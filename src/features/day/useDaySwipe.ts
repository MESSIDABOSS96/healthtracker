// src/features/day/useDaySwipe.ts
// Swipe left/right anywhere on the day screen to step a day, the way every
// calendar-shaped app on a phone already works. Drag right → the previous day
// follows your finger in from the left; drag left → the next one.
//
// Three things make this safe to hang off the WHOLE screen rather than a strip:
//
//   1. The axis is decided once, after 10px of movement, and never revisited.
//      Until then the browser is left alone, so a vertical flick scrolls
//      normally — the gesture only becomes ours if it was clearly horizontal
//      from the start.
//   2. A gesture that begins inside something that scrolls sideways (the
//      Recent/Frequent chip rows) or inside a form field belongs to that
//      element. Stealing it would make the chip rows unscrollable on the one
//      device they exist for.
//   3. Touches starting at the very edge are left to the browser, which owns
//      back/forward there in Safari. Fighting the OS gesture loses.
//
// preventDefault on touchmove is why the listeners are attached natively with
// { passive: false }: React registers touchmove passively at the root, so the
// JSX prop cannot cancel the scroll it needs to cancel.
//
// The follow transform is written straight to the node's style rather than
// through React state — one restyle per frame instead of a full re-render of a
// screen that contains the ring, the meal list and four live Dexie queries.

import { useEffect, type RefObject } from 'react';

/** Movement before the gesture commits to an axis. */
const AXIS_SLOP = 10;
/** How much more horizontal than vertical a gesture has to be to count. */
const AXIS_RATIO = 1.2;
/** A deliberate drag this far steps a day. */
const COMMIT_PX = 64;
/** …or a flick this fast, which people do without travelling far. */
const FLICK_VELOCITY = 0.5; // px/ms
const FLICK_PX = 22;
/** Safari owns the first slice of each edge for back/forward. */
const EDGE_GUARD = 26;
/** The page trails the finger rather than tracking it 1:1 — the drag is a hint
 *  that a day is coming, not a page being dragged into place. */
const FOLLOW = 0.5;
const FOLLOW_MAX = 96;
/** Pulling toward a day that doesn't exist yet: it gives, then stops. That's
 *  the answer "there is nothing here", delivered without a message. */
const BLOCKED_FOLLOW = 0.16;
const BLOCKED_MAX = 26;

const SETTLE = 'transform 260ms var(--ease-spring), opacity 200ms var(--ease-out)';

interface DaySwipeOptions {
  /** delta is -1 (previous day) or +1 (next day). */
  onStep: (delta: -1 | 1) => void;
  /** False on today — there is no forward. */
  canGoForward: boolean;
}

/** True when this gesture started somewhere that has its own use for sideways. */
function belongsToSomethingElse(target: EventTarget | null, root: HTMLElement): boolean {
  let node: Element | null = target instanceof Element ? target : null;
  while (node && node !== root.parentElement) {
    const tag = node.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useDaySwipe(
  ref: RefObject<HTMLElement | null>,
  { onStep, canGoForward }: DaySwipeOptions,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let dx = 0;
    let tracking = false;
    let claimed = false;

    const offset = (px: number) => {
      el.style.transform = px === 0 ? '' : `translate3d(${px}px, 0, 0)`;
      // Fading with distance is what tells you the day is leaving rather than
      // the page being nudged.
      el.style.opacity = px === 0 ? '' : String(Math.max(0.5, 1 - Math.abs(px) / 220));
    };

    const settle = () => {
      el.style.transition = SETTLE;
      offset(0);
    };

    const end = () => {
      tracking = false;
      claimed = false;
      el.style.willChange = '';
    };

    const onTouchStart = (e: TouchEvent) => {
      end();
      el.style.transition = '';
      offset(0);
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const width = window.innerWidth;
      if (touch.clientX < EDGE_GUARD || touch.clientX > width - EDGE_GUARD) return;
      if (belongsToSomethingElse(e.target, el)) return;
      startX = touch.clientX;
      startY = touch.clientY;
      startedAt = e.timeStamp;
      dx = 0;
      tracking = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      if (e.touches.length !== 1) {
        settle();
        end();
        return;
      }
      const touch = e.touches[0];
      dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!claimed) {
        if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return;
        // Decided once. A gesture that started as a scroll stays a scroll even
        // if it wanders sideways halfway down the page.
        if (Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) {
          end();
          return;
        }
        claimed = true;
        el.style.willChange = 'transform, opacity';
      }

      // The page is ours now — without this the vertical scroller keeps
      // reacting to the residual dy and the screen shears under the finger.
      if (e.cancelable) e.preventDefault();

      const blocked = dx < 0 && !canGoForward;
      const follow = blocked ? BLOCKED_FOLLOW : FOLLOW;
      const max = blocked ? BLOCKED_MAX : FOLLOW_MAX;
      offset(Math.max(-max, Math.min(max, dx * follow)));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!claimed) {
        end();
        return;
      }
      const elapsed = Math.max(1, e.timeStamp - startedAt);
      const velocity = Math.abs(dx) / elapsed;
      const far = Math.abs(dx) > COMMIT_PX;
      const flicked = velocity > FLICK_VELOCITY && Math.abs(dx) > FLICK_PX;
      const delta: -1 | 1 = dx > 0 ? -1 : 1;
      const commit = (far || flicked) && (delta === -1 || canGoForward);

      end();
      if (commit) {
        // Snapped back with no transition, not settled: the day underneath is
        // about to be replaced, and animating the old one home first would show
        // the outgoing content arriving where the incoming content belongs.
        el.style.transition = '';
        offset(0);
        onStep(delta);
      } else {
        settle();
      }
    };

    const onTouchCancel = () => {
      if (claimed) settle();
      end();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.willChange = '';
    };
  }, [ref, onStep, canGoForward]);
}
