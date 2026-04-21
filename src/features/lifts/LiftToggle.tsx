// src/features/lifts/LiftToggle.tsx
// UI-SPEC §"Lift card (inline, D-02)" — single-tap toggle on ☐/✓ glyph persists
// `{dayKey, lifted}` via lifts.svc.toggleLift (LIFT-01). Glyph is 32px font-size;
// p-1.5 padding on the parent button gives the ~44×44 hit area per Spacing Scale.
//
// Color policy per UI-SPEC §Accent reserved for #4:
//   - ✓ (lifted) → text-accent
//   - ☐ (not lifted) → text-muted
//
// Accessibility: aria-label toggles dynamically ("Mark lifted today" / "Undo
// lifted today") and aria-pressed mirrors the state so screen readers announce
// the binary toggle semantics.

import { toggleLift } from '@/services/lifts.svc';
import { todayKey } from '@/lib/dayKey';
import { cn } from '@/lib/utils';

interface Props {
  lifted: boolean;
  dayKey?: string; // Phase 3: Day Detail passes dayKey; Today callers omit to default to todayKey().
}

export function LiftToggle({ lifted, dayKey }: Props) {
  return (
    <button
      type="button"
      aria-label={lifted ? "Undo lifted today" : "Mark lifted today"}
      aria-pressed={lifted}
      onClick={() => {
        void toggleLift(dayKey ?? todayKey());
      }}
      className="p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
    >
      <span
        className={cn('text-[32px] leading-none', lifted ? 'text-accent' : 'text-muted')}
        aria-hidden
      >
        {lifted ? '✓' : '☐'}
      </span>
    </button>
  );
}
