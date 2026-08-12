// src/features/checkins/CheckinButtons.tsx
// One-tap lift + cardio check-offs, plus the rest-day declaration under them.
// Tapping toggles; the ring reacts live via useLiveQuery. Whole-card tap targets
// (≥44px), spring press feedback.
//
// The checked state is a tonal fill in the segment's own color — the same hue
// that lights up on the ring above — rather than a border swap. A filled tile
// reads as "done" at a glance from arm's length; a recolored 1px edge does not.
//
// Rest is deliberately a SHORTER, full-width row rather than a third tile. It
// closes the same ring segment as the two above it, so it belongs in the same
// group, but it is a statement about the day rather than something you did, and
// giving it equal visual weight to a session would read as "three workouts to
// choose from". It wears the training hue anyway, because that is the arc it
// fills, and the three can never be lit at once — checking rest clears the
// sessions and vice versa (checkins.svc), so the shared color can't confuse.
//
// `cardioDaily` (Settings: cardio every day) changes what rest promises: it then
// stands in for the lift alone and the arc still waits on cardio. The tile has
// to say which, because a rest day that visibly did NOT close training would
// otherwise read as the check-off having failed.

import { useLiveQuery } from 'dexie-react-hooks';
import { motion, useReducedMotion } from 'motion/react';
import { Dumbbell, HeartPulse, Check, Moon } from 'lucide-react';
import { getCheckinsForDay, toggleCheckin } from '@/services/checkins.svc';
import type { CheckinKind } from '@/db/schema';
import { cn } from '@/lib/utils';
import { focusRing } from '@/components/ui/styles';

const CONFIG: Array<{
  kind: CheckinKind;
  label: string;
  Icon: typeof Dumbbell;
  colorVar: string;
}> = [
  { kind: 'lift', label: 'Lifted', Icon: Dumbbell, colorVar: 'var(--ring-lift)' },
  { kind: 'cardio', label: 'Cardio', Icon: HeartPulse, colorVar: 'var(--ring-cardio)' },
];

const REST_COLOR = 'var(--ring-lift)';

interface CheckinButtonsProps {
  dayKey: string;
  /** Cardio happens every day, so a rest day covers only the lift. */
  cardioDaily?: boolean;
}

export function CheckinButtons({ dayKey, cardioDaily = false }: CheckinButtonsProps) {
  const reduceMotion = useReducedMotion();
  const checkins = useLiveQuery(() => getCheckinsForDay(dayKey), [dayKey]);
  const checked = new Set((checkins ?? []).map(c => c.kind));
  const resting = checked.has('rest');
  /** Marked off, and still short of the one thing rest doesn't cover. */
  const restPending = resting && cardioDaily && !checked.has('cardio');
  const press = reduceMotion ? undefined : { scale: 0.97 };
  const spring = { type: 'spring' as const, stiffness: 400, damping: 25 };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {CONFIG.map(({ kind, label, Icon, colorVar }) => {
          const isOn = checked.has(kind);
          return (
            <motion.button
              key={kind}
              type="button"
              onClick={() => toggleCheckin(dayKey, kind)}
              whileTap={press}
              transition={spring}
              aria-pressed={isOn}
              aria-label={`${label} — ${isOn ? 'done, tap to undo' : 'tap to check off'}`}
              className={cn(
                'relative h-[92px] rounded-lg border flex flex-col items-center justify-center gap-2',
                'transition-[background-color,border-color,color] duration-200 ease-out-soft',
                focusRing,
                isOn ? 'border-transparent' : 'border-hairline bg-surface shadow-card',
              )}
              style={
                isOn
                  ? {
                      backgroundColor: `color-mix(in srgb, ${colorVar} 13%, transparent)`,
                      borderColor: `color-mix(in srgb, ${colorVar} 32%, transparent)`,
                    }
                  : undefined
              }
            >
              {isOn && (
                <span
                  aria-hidden
                  className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full"
                  style={{ backgroundColor: colorVar }}
                >
                  <Check size={12} strokeWidth={3.5} className="text-surface" />
                </span>
              )}
              <Icon
                size={24}
                strokeWidth={isOn ? 2.2 : 1.9}
                style={{ color: isOn ? colorVar : 'var(--faint)' }}
                aria-hidden
              />
              <span
                className="text-sm font-medium"
                style={{ color: isOn ? colorVar : 'var(--text)' }}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={() => toggleCheckin(dayKey, 'rest')}
        whileTap={press}
        transition={spring}
        aria-pressed={resting}
        aria-label={
          resting
            ? restPending
              ? 'Rest day — marked, cardio still to go; tap to undo'
              : 'Rest day — marked, tap to undo'
            : cardioDaily
              ? 'Rest day — tap to mark this a planned day off; covers your lift, cardio still counts'
              : 'Rest day — tap to mark this a planned day off; training counts as done'
        }
        className={cn(
          'flex h-[54px] w-full items-center gap-3 rounded-lg border px-4',
          'transition-[background-color,border-color,color] duration-200 ease-out-soft',
          focusRing,
          resting ? 'border-transparent' : 'border-hairline bg-surface shadow-card',
        )}
        style={
          resting
            ? {
                backgroundColor: `color-mix(in srgb, ${REST_COLOR} 13%, transparent)`,
                borderColor: `color-mix(in srgb, ${REST_COLOR} 32%, transparent)`,
              }
            : undefined
        }
      >
        <Moon
          size={19}
          strokeWidth={resting ? 2.2 : 1.9}
          style={{ color: resting ? REST_COLOR : 'var(--faint)' }}
          aria-hidden
        />
        <span
          className="flex-1 text-left text-sm font-medium"
          style={{ color: resting ? REST_COLOR : 'var(--text)' }}
        >
          Rest day
        </span>
        {/* The trailing slot carries both when cardio is daily: the tile IS
            checked, and the day still isn't finished training. Dropping the
            hint the moment rest is marked is what would make a stalled arc look
            like the tap hadn't registered. */}
        {(!resting || restPending) && (
          <span aria-hidden className="text-[12px] text-faint">
            {restPending
              ? 'cardio still to go'
              : cardioDaily
                ? 'covers your lift'
                : 'closes training'}
          </span>
        )}
        {resting && (
          <span
            aria-hidden
            className="grid h-5 w-5 place-items-center rounded-full"
            style={{ backgroundColor: REST_COLOR }}
          >
            <Check size={12} strokeWidth={3.5} className="text-surface" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
