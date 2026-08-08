// src/features/closure/ClosureRing.tsx
// The daily motivator: a 3-segment ring (food / lift / cardio) that fills as
// each component is addressed and celebrates when the day closes.
//
// Motion notes (per apple-design / improve-animations skills):
//   - Segments animate pathLength with a soft spring — interruptible, no tween.
//   - Closure celebration is a single scale pulse + glow, not confetti.
//   - prefers-reduced-motion collapses everything to instant state changes.
//   - Animations are SVG-only (stroke props) — no layout thrash on low-end phones.

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import type { DayClosure } from '@/services/closure.svc';
import { ringSegments } from './ringMath';

const SIZE = 220;
const C = SIZE / 2;
const R = 88;
const STROKE = 16;

const SEGMENT_COLOR: Record<'food' | 'lift' | 'cardio', string> = {
  food: 'var(--ring-food)',
  lift: 'var(--ring-lift)',
  cardio: 'var(--ring-cardio)',
};

const SEGMENT_LABEL: Record<'food' | 'lift' | 'cardio', string> = {
  food: 'Food',
  lift: 'Lift',
  cardio: 'Cardio',
};

interface ClosureRingProps {
  closure: DayClosure;
  streak: number | undefined;
}

export function ClosureRing({ closure, streak }: ClosureRingProps) {
  const reduceMotion = useReducedMotion();
  const segments = ringSegments(C, C, R);
  const doneCount = [closure.food, closure.lift, closure.cardio].filter(Boolean).length;

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
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative"
        animate={
          celebrate && !reduceMotion
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Day progress: ${doneCount} of 3 complete${closure.closed ? ' — day closed' : ''}`}
          style={
            closure.closed
              ? { filter: 'drop-shadow(0 0 18px rgba(34, 197, 94, 0.35))' }
              : undefined
          }
          className="transition-[filter] duration-500"
        >
          {segments.map(seg => (
            <path
              key={`track-${seg.key}`}
              d={seg.path}
              fill="none"
              stroke="var(--border)"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          ))}
          {segments.map(seg => {
            const filled =
              seg.key === 'food' ? closure.food : seg.key === 'lift' ? closure.lift : closure.cardio;
            return (
              <motion.path
                key={`fill-${seg.key}`}
                d={seg.path}
                fill="none"
                stroke={SEGMENT_COLOR[seg.key]}
                strokeWidth={STROKE}
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: filled ? 1 : 0, opacity: filled ? 1 : 0 }}
                transition={spring}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {closure.closed ? (
            <>
              <span className="rounded-full bg-accent/15 p-2.5">
                <Check size={28} className="text-accent" aria-hidden />
              </span>
              <span className="mt-1.5 text-sm font-medium text-accent">Day closed</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-semibold tabular-nums text-text">
                {doneCount}
                <span className="text-muted text-xl font-normal"> / 3</span>
              </span>
              <span className="mt-0.5 text-xs text-muted">to close the day</span>
            </>
          )}
          {streak !== undefined && streak > 0 && (
            <span className="mt-1.5 text-xs text-muted tabular-nums">
              {streak} day streak
            </span>
          )}
        </div>
      </motion.div>

      <div className="flex items-center gap-4" aria-hidden>
        {(['food', 'lift', 'cardio'] as const).map(key => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: SEGMENT_COLOR[key] }}
            />
            {SEGMENT_LABEL[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
