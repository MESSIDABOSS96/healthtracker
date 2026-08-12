// src/features/closure/ClosureRing.tsx
// The daily motivator: a 3-segment ring (protein / calories / training) that
// fills PROPORTIONALLY and celebrates when the day closes.
//
// The segments used to be switches — food logged, lifted, did cardio — so the
// ring only ever showed 0, 1/3, 2/3 or done, and a day where you ate 48g of a
// 50g protein goal looked identical to one where you ate nothing. Arcs now
// track their component's progress, which is the whole reason the closure model
// grades instead of asking yes/no.
//
// Design notes:
//   - Unfilled segments wear their OWN color at low opacity rather than a
//     neutral track. The empty ring already tells you what the three slots
//     are, so filling one is a saturation event, not an appearance event.
//   - The legend under the ring is live state, not decoration: each entry
//     shows how far along it is and gains a check when it's actually met, so
//     "what's left" is readable without decoding the arcs.
//   - `met` drives the check, `progress` drives the arc. A segment at 99% is
//     visibly nearly-full and still unchecked, which is the honest reading.
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
import { ringSegments, SEGMENT_ORDER, type SegmentKey } from './ringMath';

const SIZE = 232;
const C = SIZE / 2;
const R = 96;
const STROKE = 15;
/** Opacity of an unfilled segment's own color. Low enough to recede, high
 *  enough to name the slot on both grounds. */
const TRACK_OPACITY = 0.24;

const SEGMENT_COLOR: Record<SegmentKey, string> = {
  protein: 'var(--ring-food)',
  calories: 'var(--ring-cardio)',
  training: 'var(--ring-lift)',
};

const SEGMENT_LABEL: Record<SegmentKey, string> = {
  protein: 'Protein',
  calories: 'Calories',
  training: 'Training',
};

/** What the calorie goal means today — a ceiling, a floor, or a band. */
const CALORIE_HINT: Record<DayClosure['direction'], string> = {
  lose: 'under',
  gain: 'over',
  maintain: 'near',
};

interface ClosureRingProps {
  closure: DayClosure;
  streak: number | undefined;
}

export function ClosureRing({ closure, streak }: ClosureRingProps) {
  const reduceMotion = useReducedMotion();
  const segments = ringSegments(C, C, R);
  const component = {
    protein: closure.protein,
    calories: closure.calories,
    training: closure.training,
  };

  const percent = Math.round(closure.progress * 100);
  const metCount = SEGMENT_ORDER.filter(k => component[k].met).length;
  const remaining = 3 - metCount;

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

  /** The sub-line under each legend entry: how far along, in its own units. */
  const detail = (key: SegmentKey): string => {
    if (key === 'protein') {
      return closure.proteinGoal > 0
        ? `${Math.round(closure.proteinTotal)}/${Math.round(closure.proteinGoal)}g`
        : '—';
    }
    if (key === 'calories') {
      return closure.caloriesGoal > 0
        ? `${closure.caloriesTotal}/${closure.caloriesGoal}`
        : '—';
    }
    if (closure.lift && closure.cardio) return 'lift · cardio';
    // Rest + cardio is only reachable when cardio is daily, and it's the normal
    // shape of an off day there: no lift, walk done, arc full.
    if (closure.rest && closure.cardio) return 'rest · cardio';
    if (closure.cardio) return 'cardio';
    // A half-full arc has to name what's missing. Under daily cardio the lift or
    // the declared day off is only half the answer, and "lift" alone beside an
    // unclosed segment reads as the check-off not having counted.
    if (closure.lift) return closure.cardioDaily ? 'lift · cardio to go' : 'lift';
    // Named rather than shown as a generic tick: a filled training arc on a day
    // with no session needs to say what filled it, or it reads as a bug.
    if (closure.rest) return closure.cardioDaily ? 'rest · cardio to go' : 'rest day';
    return 'none yet';
  };

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
          aria-label={
            closure.closed
              ? 'Day closed — protein, calories and training all met'
              : `Day ${percent} percent complete: ${SEGMENT_ORDER.map(
                  k => `${SEGMENT_LABEL[k]} ${Math.round(component[k].progress * 100)}%`,
                ).join(', ')}`
          }
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
          {segments.map(seg => {
            const progress = component[seg.key].progress;
            return (
              <motion.path
                key={`fill-${seg.key}`}
                d={seg.path}
                fill="none"
                stroke={SEGMENT_COLOR[seg.key]}
                strokeWidth={STROKE}
                strokeLinecap="round"
                initial={false}
                // Opacity is binary on "has any progress at all" rather than
                // scaled: a partial arc should be a SHORT full-strength arc,
                // not a faded full-length one, or partial and unfilled blur
                // into each other.
                animate={{ pathLength: progress, opacity: progress > 0 ? 1 : 0 }}
                transition={spring}
              />
            );
          })}
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
                {percent}
                <span className="text-faint text-[30px] font-medium">%</span>
              </span>
              <span className="mt-2 text-[13px] text-muted">
                {remaining === 1 ? 'one left to close' : `${remaining} left to close`}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Live legend — which slots are filled, in words and numbers.
          A 3-column grid rather than a flex row: "1840/2000 under" is much
          wider than "Protein", and in a row one long item pushes the others off
          a narrow phone. Equal columns cap each item instead. */}
      <ul className="mt-5 grid w-full max-w-[330px] grid-cols-3 gap-x-2">
        {SEGMENT_ORDER.map(key => {
          const { met } = component[key];
          const hint = key === 'calories' && closure.caloriesGoal > 0
            ? CALORIE_HINT[closure.direction]
            : null;
          return (
            <li
              key={key}
              className="flex min-w-0 flex-col items-center gap-0.5 text-[13px] transition-colors duration-300 ease-out-soft"
              style={{ color: met ? SEGMENT_COLOR[key] : 'var(--faint)' }}
            >
              <span className="flex items-center gap-1.5">
                {met ? (
                  <Check size={13} strokeWidth={3} aria-hidden />
                ) : (
                  <span
                    aria-hidden
                    className="inline-block h-[7px] w-[7px] rounded-full"
                    style={{ backgroundColor: SEGMENT_COLOR[key], opacity: 0.5 }}
                  />
                )}
                <span className={met ? 'font-medium' : ''}>{SEGMENT_LABEL[key]}</span>
              </span>
              <span className="flex max-w-full items-baseline gap-1 text-[11.5px]">
                <span className="stat truncate text-muted">{detail(key)}</span>
                {hint && <span className="shrink-0 text-faint">{hint}</span>}
              </span>
            </li>
          );
        })}
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
