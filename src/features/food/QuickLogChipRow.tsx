// src/features/food/QuickLogChipRow.tsx
// Horizontal-scroll chip container per UI-SPEC §"Quick-log chip row".
// - Section label above (eyebrow).
// - `foods === undefined` → render nothing (loading).
// - `foods.length === 0` with emptyCopy → show empty message.
// - `foods.length === 0` without emptyCopy → hide row entirely (Frequent case).
//
// The row bleeds to both screen edges so a half-visible chip at the margin
// reads as "there's more". The scrollbar is hidden — on a phone it's chrome
// for a gesture the user already knows.

import type { Food } from '@/db/schema';
import { eyebrow } from '@/components/ui/styles';
import { QuickLogChip } from './QuickLogChip';

interface QuickLogChipRowProps {
  label: string;
  foods: Food[] | undefined;
  emptyCopy?: string;
  onLog: (food: Food) => void;
  onRemove?: (food: Food) => void;
}

export function QuickLogChipRow({
  label,
  foods,
  emptyCopy,
  onLog,
  onRemove,
}: QuickLogChipRowProps) {
  if (foods === undefined) return null;

  if (foods.length === 0) {
    if (!emptyCopy) return null;
    return (
      <div className="space-y-2 px-4 lg:px-0">
        <p className={eyebrow}>{label}</p>
        <p className="text-[13px] leading-relaxed text-muted">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className={`${eyebrow} px-4 lg:px-0`}>{label}</p>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {foods.map(f => (
          <QuickLogChip key={f.id} food={f} onLog={onLog} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
