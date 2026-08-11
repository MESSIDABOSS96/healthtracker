// src/lib/servings.ts
// How many servings of a known food the typed amount asks for.
//
// Every food stores its numbers against one serving — "100 g", "1 packet",
// "1 (whole thing)". A log is that serving times a count, and this is the one
// place that count is worked out. Three cases, and only one of them is
// interesting:
//
//   nothing typed        → 1 serving. "chipotle bowl" is one bowl.
//   a bare number        → that many servings. "chicken breast 1.5", "welchs 2".
//                          Works whatever the serving is, because "1.5" is
//                          stated in servings by definition.
//   a weight             → divide by the serving weight. "chicken breast 150g"
//                          against a 100 g serving is 1.5 — the division the
//                          user would otherwise do on a phone calculator.
//
// The one thing that CANNOT be answered is a weight against a serving measured
// in items: nothing here knows what one packet of fruit snacks weighs, and
// there is no honest conversion without it. That returns a refusal carrying its
// own explanation rather than a number, because the alternative — quietly
// logging "your usual" whenever the units didn't line up — is what used to make
// `2 egg` log ONE egg with nothing on screen saying the 2 had been discarded.

import type { Amount } from './foodQuery';

export interface ServingBasis {
  /** How much one serving is. 100 for a per-100g food, 1 for a per-item one. */
  servingQty?: number;
  /** 'g' | 'ml' | 'count'. */
  servingUnit?: string;
}

export type ServingsResult =
  | { ok: true; servings: number }
  | { ok: false; reason: string };

export function servingsFor(amount: Amount | undefined, basis: ServingBasis): ServingsResult {
  const qty = basis.servingQty && basis.servingQty > 0 ? basis.servingQty : 1;
  const unit = basis.servingUnit ?? 'count';

  if (!amount) return { ok: true, servings: 1 };

  // A bare count is already stated in servings, whatever a serving happens to be.
  if (amount.unit === 'count') return positive(amount.value);

  if (amount.unit === unit) return positive(amount.value / qty);

  return {
    ok: false,
    reason: `This is measured per ${qty === 1 ? '' : `${qty} `}${labelUnit(unit, qty)} — say how many, not a weight.`,
  };
}

function labelUnit(unit: string, qty: number): string {
  if (unit === 'count') return qty === 1 ? 'item' : 'items';
  return unit;
}

function positive(value: number): ServingsResult {
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: "That amount doesn't work out to anything." };
  }
  return { ok: true, servings: Math.round(value * 1000) / 1000 };
}
