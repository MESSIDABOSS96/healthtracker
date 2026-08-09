// src/features/checkins/CheckinButtons.tsx
// One-tap lift + cardio check-offs. Tapping toggles; the ring reacts live via
// useLiveQuery. Whole-card tap targets (≥44px), spring press feedback.
//
// The checked state is a tonal fill in the segment's own color — the same hue
// that lights up on the ring above — rather than a border swap. A filled tile
// reads as "done" at a glance from arm's length; a recolored 1px edge does not.

import { useLiveQuery } from 'dexie-react-hooks';
import { motion, useReducedMotion } from 'motion/react';
import { Dumbbell, HeartPulse, Check } from 'lucide-react';
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

export function CheckinButtons({ dayKey }: { dayKey: string }) {
  const reduceMotion = useReducedMotion();
  const checkins = useLiveQuery(() => getCheckinsForDay(dayKey), [dayKey]);
  const checked = new Set((checkins ?? []).map(c => c.kind));

  return (
    <div className="grid grid-cols-2 gap-3">
      {CONFIG.map(({ kind, label, Icon, colorVar }) => {
        const isOn = checked.has(kind);
        return (
          <motion.button
            key={kind}
            type="button"
            onClick={() => toggleCheckin(dayKey, kind)}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
  );
}
