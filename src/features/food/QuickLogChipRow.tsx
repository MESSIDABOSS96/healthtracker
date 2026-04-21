// src/features/food/QuickLogChipRow.tsx
// Horizontal-scroll chip container per UI-SPEC §"Quick-log chip row".
// - Section label above (uppercase muted).
// - `foods === undefined` → render nothing (loading).
// - `foods.length === 0` with emptyCopy → show empty message.
// - `foods.length === 0` without emptyCopy → hide row entirely (Frequent case).

import type { Food } from '@/db/schema';
import { QuickLogChip } from './QuickLogChip';

interface QuickLogChipRowProps {
  label: string;
  foods: Food[] | undefined;
  emptyCopy?: string;
  onLog: (food: Food) => void;
}

export function QuickLogChipRow({ label, foods, emptyCopy, onLog }: QuickLogChipRowProps) {
  if (foods === undefined) return null;

  if (foods.length === 0) {
    if (!emptyCopy) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted uppercase tracking-wide px-4">{label}</p>
        <p className="px-4 text-sm text-muted">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted uppercase tracking-wide px-4">{label}</p>
      <div className="flex overflow-x-auto gap-2 px-4 py-1">
        {foods.map((f) => (
          <QuickLogChip key={f.id} food={f} onLog={onLog} />
        ))}
      </div>
    </div>
  );
}
