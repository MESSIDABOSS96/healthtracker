// src/features/checkins/CheckinButtons.tsx
// One-tap lift + cardio check-offs. Tapping toggles; the ring reacts live via
// useLiveQuery. Whole-card tap targets (≥44px), spring press feedback.

import { useLiveQuery } from 'dexie-react-hooks';
import { motion, useReducedMotion } from 'motion/react';
import { Dumbbell, HeartPulse, Check } from 'lucide-react';
import { getCheckinsForDay, toggleCheckin } from '@/services/checkins.svc';
import type { CheckinKind } from '@/db/schema';
import { cn } from '@/lib/utils';

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
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            aria-pressed={isOn}
            aria-label={`${label} — ${isOn ? 'done, tap to undo' : 'tap to check off'}`}
            className={cn(
              'h-20 rounded-xl border flex flex-col items-center justify-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              isOn ? 'bg-surface' : 'bg-surface border-border hover:bg-border/30',
            )}
            style={isOn ? { borderColor: colorVar } : undefined}
          >
            <span className="relative">
              <Icon size={22} style={{ color: isOn ? colorVar : 'var(--muted)' }} aria-hidden />
              {isOn && (
                <span
                  className="absolute -right-2 -top-1.5 rounded-full bg-bg"
                  aria-hidden
                >
                  <Check size={12} style={{ color: colorVar }} strokeWidth={3} />
                </span>
              )}
            </span>
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
