// src/features/lifts/LiftNoteInput.tsx
// UI-SPEC §"Lift card (inline, D-02)" — single-line text input that blur-saves via
// lifts.svc.setLiftNote (LIFT-02). Mirrors the Steps inline input pattern: Enter
// blurs (commits via onBlur), Escape reverts the local value and tells the parent
// to close the reveal without a write. queueMicrotask focus-flicker guard.
//
// Rendered as text (React auto-escapes JSX children) — no dangerouslySetInnerHTML.

import { useState, useRef, useEffect } from 'react';
import { setLiftNote } from '@/services/lifts.svc';
import { todayKey } from '@/lib/dayKey';

interface Props {
  currentNote: string;
  onCommitted: () => void;
  dayKey?: string; // Phase 3: Day Detail passes dayKey; Today callers omit to default to todayKey().
}

export function LiftNoteInput({ currentNote, onCommitted, dayKey }: Props) {
  const [value, setValue] = useState(currentNote);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const commit = async () => {
    await setLiftNote(dayKey ?? todayKey(), value.trim());
    onCommitted();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Optional note"
      aria-label="Lift note"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setValue(currentNote);
          onCommitted();
        }
      }}
      className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    />
  );
}
