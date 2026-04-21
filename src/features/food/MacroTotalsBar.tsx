// src/features/food/MacroTotalsBar.tsx
// Sticky 56px macro totals bar for the Food Sheet per UI-SPEC §"Sticky macro totals bar".
//
// W-03 MANDATE: inline 4px thin-bar implementation. This component MUST NOT import
// or render the shared primitive (which is 8px / h-2). The Food Sheet's column bars
// are intentionally decoupled from the Today-card macro bars so the shared primitive
// remains stable for its other consumers.
//
// D-16 zero-target sentinel: when `target === 0`, render consumed-only, no bar.

import { useDailyTotals } from './hooks';
import { useGoals } from '@/features/settings/hooks';

export function MacroTotalsBar() {
  const totals = useDailyTotals();
  const goals = useGoals();

  const cals = totals?.calories ?? 0;
  const p = totals?.proteinG ?? 0;
  const c = totals?.carbsG ?? 0;
  const f = totals?.fatG ?? 0;

  const tCals = goals?.calories ?? 0;
  const tP = goals?.proteinG ?? 0;
  const tC = goals?.carbsG ?? 0;
  const tF = goals?.fatG ?? 0;

  return (
    <div className="sticky top-0 z-10 h-14 bg-surface border-b border-border flex divide-x divide-border">
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 gap-1">
        <span className="text-base font-semibold text-text tabular-nums">{Math.round(cals)}</span>
        <span className="text-xs text-muted">cal</span>
        {tCals > 0 ? (
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(100, (cals / tCals) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 gap-1">
        <span className="text-base font-semibold text-text tabular-nums">{Math.round(p)}</span>
        <span className="text-xs text-muted">P</span>
        {tP > 0 ? (
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(100, (p / tP) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 gap-1">
        <span className="text-base font-semibold text-text tabular-nums">{Math.round(c)}</span>
        <span className="text-xs text-muted">C</span>
        {tC > 0 ? (
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(100, (c / tC) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 gap-1">
        <span className="text-base font-semibold text-text tabular-nums">{Math.round(f)}</span>
        <span className="text-xs text-muted">F</span>
        {tF > 0 ? (
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(100, (f / tF) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
