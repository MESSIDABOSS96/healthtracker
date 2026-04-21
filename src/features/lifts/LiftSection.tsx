// src/features/lifts/LiftSection.tsx
// Today-card Lift wrapper. Layout per UI-SPEC §"Today-card status slot (live layout)"
// Lift row: Heading left + glyph right ONLY (no progress bar — lift is binary, not numeric).
// D-02 inline (NO Sheet). The "Add note" affordance appears only after the lift is
// toggled on (LIFT-02), matching UI-SPEC §"Lift card" line 305.
//
// Reads schema field `lifted` (not `didLift`) via useLiftForDay → getLiftForDay.

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { LiftToggle } from './LiftToggle';
import { LiftNoteInput } from './LiftNoteInput';
import { useLiftForDay } from './hooks';

export function LiftSection() {
  const lift = useLiftForDay();
  const lifted = !!lift?.lifted;
  const note = lift?.note ?? '';
  const [editingNote, setEditingNote] = useState(false);

  return (
    <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-text">Lift</h2>
        <LiftToggle lifted={lifted} />
      </div>
      {lifted && (
        <div className="pt-2">
          {editingNote ? (
            <LiftNoteInput
              currentNote={note}
              onCommitted={() => setEditingNote(false)}
            />
          ) : note ? (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="text-sm text-text text-left w-full"
            >
              {note}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="text-sm text-muted text-left w-full"
            >Add note</button>
          )}
        </div>
      )}
    </Card>
  );
}
