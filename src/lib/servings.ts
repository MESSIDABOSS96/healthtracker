// src/lib/servings.ts
// How much of a library food the typed text asks for.
//
// A library row stores its facts against a serving — either "100 g" (anything
// the app measured by weight) or "1 item" (anything it counted). The text can
// name an amount in a unit that doesn't match, and the interesting part is that
// the two mismatches are NOT symmetrical:
//
//   "2 egg"          count  → weight-based row : answerable. Nothing here knows
//                    what one egg weighs, but the app knows what you logged
//                    last time, and two of your usual portion is exactly what
//                    "2 egg" means to the person typing it.
//   "protein bar 60g" weight → item-based row  : not answerable. There is no
//                    honest conversion from grams to items without an item
//                    weight, and inventing one writes a wrong number silently.
//
// The rule that falls out: A LIBRARY ROW IS ONLY OFFERED WHEN IT CAN HONOUR THE
// AMOUNT THAT WAS TYPED. The unanswerable case returns null and the resolver
// drops the candidate, so the tier below — the USDA table, which is per-100g
// and can answer it exactly — gets the question instead.
//
// That replaces the old behaviour, which was to quietly fall back to "your
// usual" whenever the units didn't line up. Typing `2 egg` logged ONE egg, and
// nothing on screen said the 2 had been discarded. Worse, it only did that
// after the food reached your library: before then, `2 eggs` resolved off the
// table and was correct. The app got less trustworthy the more you used it.

import type { FoodUnit } from './foodQuery';

export interface ServingBasis {
  /** How much one serving is — 100 for a per-100g row, 1 for a per-item row. */
  servingQty: number;
  /** 'g' | 'ml' | 'count'. */
  servingUnit: string;
  /** What this food was logged as last time: the app's answer to "the usual". */
  lastServings?: number;
}

export interface AmountQuery {
  quantity?: number;
  unit?: FoodUnit;
  multiplier?: number;
}

/**
 * Servings of `basis` that `q` describes, or null when this food cannot express
 * the amount typed.
 */
export function libraryServings(q: AmountQuery, basis: ServingBasis): number | null {
  const { servingQty, servingUnit } = basis;
  const usual = basis.lastServings && basis.lastServings > 0 ? basis.lastServings : 1;
  const multiplier = q.multiplier ?? 1;

  // No amount named — re-log whatever it was last time, which is the same
  // semantics as tapping its quick-log chip. A bare multiplier scales that:
  // "protein shake x2" is two of your usual shake.
  if (q.quantity === undefined) return positive(usual * multiplier, usual);

  // Same unit: straight division. 200g against a per-100g row is 2 servings,
  // and 2 against a per-item row is 2.
  if (q.unit === servingUnit && servingQty > 0) {
    return positive(q.quantity / servingQty, usual);
  }

  // A count against a food measured by weight: N of your usual portion. Note
  // the quantity has already absorbed any multiplier upstream (parseFoodQuery
  // pre-multiplies it), so folding one in again here would double-count.
  if (q.unit === 'count') return positive(usual * q.quantity, usual);

  return null;
}

/** Keep a computed amount sane without ever silently logging zero. */
function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
