// src/features/closure/ClosureRing.tsx
// The daily motivator: a 3-segment ring (food / lift / cardio) that fills as
// each component is addressed and celebrates when the day closes.
//
// Design notes:
//   - Unfilled segments wear their OWN color at low opacity rather than a
//     neutral track. The empty ring already tells you what the three slots
//     are, so filling one is a saturation event, not an appearance event.
//   - The legend under the ring is live state, not decoration: each entry
//     brightens and gains a check when its segment lands, so "what's left"
//     is readable without decoding the arcs.
//   - Stroke is thinner relative to the radius than a stock activity ring —
//     at this size a heavy stroke reads as a chart, a light one as a dial.
//
// Motion notes (per apple-design / improve-animations skills):
//   - Segments animate pathLength with a soft spring — interruptible, no tween.
//   - Closure celebration is a single scale pulse + glow, not confetti.
//   - prefers-reduced-motion collapses everything to instant state changes.
//   - Animations are SVG-only (stroke props) — no layout thrash on low-end phones.

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Flame } from 'lucide-react';
import type { DayClosure } from '@/services/closure.svc';
import { ringSegments } from './ringMath';

const SIZE = 232;
const C = SIZE / 2;
const R = 96;
const STROKE = 15;
/** Opacity of an unfilled segment's own color. Low enough to recede, high
 *  enough to name the slot on both grounds. */
const TRACK_OPACITY = 0.24;

type SegKey = 'food' | 'lift' | 'cardio';

const SEGMENT_COLOR: Record<SegKey, string> = {
  food: 'var(--ring-food)',
  lift: 'var(--ring-lift)',
  cardio: 'var(--ring-cardio)',
};

const SEGMENT_LABEL: Record<SegKey, string> = {
  food: 'Food',
  lift: 'Lift',
  cardio: 'Cardio',
};

const ORDER: SegKey[] = ['food', 'lift', 'cardio'];

interface ClosureRingProps {
  closure: DayClosure;
  streak: number | undefined;
}

export function ClosureRing({ closure, streak }: ClosureRingProps) {
  const reduceMotion = useReducedMotion();
  const segments = ringSegments(C, C, R);
  const done: Record<SegKey, boolean> = {
    food: closure.food,
    lift: closure.lift,
    cardio: closure.cardio,
  };
  const doneCount = ORDER.filter(k => done[k]).length;
  const remaining = 3 - doneCount;

  // Celebrate only on a live transition into closed — not on mount with an
  // already-closed day (e.g. reopening the app at night).
  const prevClosed = useRef<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (prevClosed.current === false && closure.closed) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 900);
      return () => clearTimeout(t);
    }
    prevClosed.current = closure.closed;
  }, [closure.closed]);

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 80, damping: 16 };

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative"
        animate={celebrate && !reduceMotion ? { scale: [1, 1.045, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.4, 0.64, 1] }}
      >
        {/* Ambient wash behind a closed ring. Sits under the SVG so the arcs
            stay crisp; blur is cheap here because the element never repaints. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-full blur-2xl transition-opacity duration-700 ease-out-soft"
          style={{
            background: 'radial-gradient(circle, var(--ring-glow) 0%, transparent 70%)',
            opacity: closure.closed ? 1 : 0,
          }}
        />

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Day progress: ${doneCount} of 3 complete${closure.closed ? ' — day closed' : ''}`}
          className="relative"
        >
          {segments.map(seg => (
            <path
              key={`track-${seg.key}`}
              d={seg.path}
              fill="none"
              stroke={SEGMENT_COLOR[seg.key]}
              strokeOpacity={TRACK_OPACITY}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          ))}
          {segments.map(seg => (
            <motion.path
              key={`fill-${seg.key}`}
              d={seg.path}
              fill="none"
              stroke={SEGMENT_COLOR[seg.key]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: done[seg.key] ? 1 : 0, opacity: done[seg.key] ? 1 : 0 }}
              transition={spring}
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {closure.closed ? (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-closed-wash">
                <Check size={26} className="text-closed" strokeWidth={2.6} aria-hidden />
              </span>
              <span className="mt-2.5 font-display text-[15px] font-semibold tracking-[-0.01em] text-closed">
                Day closed
              </span>
            </>
          ) : (
            <>
              <span className="stat text-[56px] leading-none font-semibold text-text">
                {doneCount}
                <span className="text-faint text-[30px] font-medium">/3</span>
              </span>
              <span className="mt-2 text-[13px] text-muted">
                {remaining === 1 ? 'one left to close' : `${remaining} left to close`}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Live legend — which slots are filled, in words. */}
      <ul className="mt-5 flex items-center gap-5">
        {ORDER.map(key => (
          <li
            key={key}
            className="flex items-center gap-1.5 text-[13px] transition-colors duration-300 ease-out-soft"
            style={{ color: done[key] ? SEGMENT_COLOR[key] : 'var(--faint)' }}
          >
            {done[key] ? (
              <Check size={13} strokeWidth={3} aria-hidden />
            ) : (
              <span
                aria-hidden
                className="inline-block h-[7px] w-[7px] rounded-full"
                style={{ backgroundColor: SEGMENT_COLOR[key], opacity: 0.5 }}
              />
            )}
            <span className={done[key] ? 'font-medium' : ''}>{SEGMENT_LABEL[key]}</span>
          </li>
        ))}
      </ul>

      {streak !== undefined && streak > 0 && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-closed-wash px-3 py-1.5 text-[13px] font-medium text-closed">
          <Flame size={13} strokeWidth={2.4} aria-hidden />
          <span className="stat">{streak}</span> day streak
        </span>
      )}
    </div>
  );
}
