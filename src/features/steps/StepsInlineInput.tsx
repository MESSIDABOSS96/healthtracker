// src/features/steps/StepsInlineInput.tsx
// UI-SPEC §"Steps card (inline, D-02)" — controlled number input rendered inside the
// Steps card's status slot after the user taps. Commits on blur; Enter blurs (which
// triggers commit via onBlur, avoiding double-fire); Escape reverts the local value
// and tells the parent to close the reveal without a write.
//
// Focus-flicker guard: queueMicrotask lets the reveal finish its render frame before
// focus lands on the input. Without this, iOS Safari occasionally races the focus
// and keyboard pops up at 0 px offset then shifts (RESEARCH Example E).
//
// Integer overflow mitigation (threat_model): HTML min/max bound + Number.isFinite +
// Math.floor(parseInt(...)). 999_999 is wide enough for any realistic daily step count.

import { useState, useRef, useEffect } from 'react';
import { upsertSteps } from '@/services/steps.svc';
import { todayKey } from '@/lib/dayKey';

interface Props {
  currentCount: number;
  onCommitted: () => void; // parent closes the reveal after commit or cancel
}

export function StepsInlineInput({ currentCount, onCommitted }: Props) {
  const [value, setValue] = useState(String(currentCount || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const commit = async () => {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 999_999) {
      await upsertSteps(todayKey(), Math.floor(parsed));
    }
    onCommitted();
  };

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      min="0"
      max="999999"
      placeholder="0"
      aria-label="Enter step count for today"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur(); /* triggers commit via onBlur */
        }
        if (e.key === 'Escape') {
          setValue(String(currentCount || ''));
          onCommitted();
        }
      }}
      className="h-11 w-24 px-3 rounded-md bg-bg border border-border text-text tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    />
  );
}
