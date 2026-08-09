// src/lib/foodQuery.ts
// One structured read of whatever the user typed, shared by every tier of the
// food resolver.
//
// The old design parsed the input twice with different grammars — once in the
// local fallback, once implicitly by shipping the raw string to a language
// model — which meant "chicken 200g 31p 0c 4f" (pure arithmetic) and "banana"
// (a lookup) went down the same slow path. Splitting the read from the answer
// lets the resolver route on what the text actually contains:
//
//   facts present            → arithmetic, no lookup needed        (tier 1)
//   name + quantity only     → look the name up, scale by quantity (tier 0/2)
//   neither                  → hand the whole string to the model  (tier 3)
//
// Nothing here touches the network or the database. It is pure and synchronous.

export type FoodUnit = 'g' | 'ml' | 'count';

/** Which amount the nutrition numbers in the text describe. */
export type FactBasis = 'total' | 'per100' | 'perServing';

export interface FoodQuery {
  /** Whatever text was left after the numbers were consumed. */
  name: string;
  quantity?: number;
  unit?: FoodUnit;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  basis: FactBasis;
  /**
   * "I had N of these." Multiplies the whole entry — amount and macros alike —
   * so a portion you've already described once doesn't have to be re-typed or
   * re-multiplied in your head. Absent means 1.
   */
  multiplier?: number;
  /** True when the text carried at least one nutrition number. */
  hasFacts: boolean;
  /** The original input, untouched — tier 3 wants the user's own words. */
  raw: string;
}

const OZ_TO_G = 28.35;
const LB_TO_G = 453.592;

/**
 * Extraction is ordered longest-token-first so that a short pattern can't eat
 * part of a long one: `210cal` must be read as calories before `<n>c` gets a
 * chance to see "210c". Each match is blanked out of the working string, so by
 * the end whatever remains is the food's name.
 */
export function parseFoodQuery(input: string): FoodQuery {
  const raw = input.trim();
  let rest = ` ${raw} `;

  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = rest.match(re);
    if (m) rest = rest.replace(re, ' ');
    return m;
  };

  const num = (s: string | undefined) => {
    if (s === undefined) return undefined;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };

  // --- 1. Basis markers -----------------------------------------------------
  // What amount do the numbers in this text describe? Per 100g wins the race
  // because "per 100g" would otherwise also satisfy the per-serving pattern.
  //
  // The serving nouns are an explicit list rather than `per <anything>`: a
  // catch-all would read "chicken per pound" or a food literally named "per"
  // as a basis marker, and getting this wrong silently rescales every macro.
  let basis: FactBasis = 'total';
  if (take(/(?:\/|\bper\s*)100\s*(?:g|ml|grams?)\b/i)) basis = 'per100';
  else if (
    take(
      /(?:\/|\bper\s*)(?:servings?|portions?|bars?|slices?|scoops?|pieces?|items?|packs?|packets?|containers?|bottles?|cans?|pots?|tubs?|sachets?|squares?|cookies?|eggs?)\b/i,
    )
  ) {
    basis = 'perServing';
  }

  // --- 2. Quantity ----------------------------------------------------------
  // Deliberately BEFORE the macro labels. "salmon 200g calories 400" is the
  // trap: leaving 200g in place lets the number-then-label reader bind it as
  // "200 calories" and silently log a wrong number. Consuming the quantity
  // first makes each remaining label unambiguous as the scan moves left to
  // right.
  //
  // The rule this settles on: THE FIRST NUMBER CARRYING A MASS OR VOLUME UNIT
  // IS THE AMOUNT EATEN. That is true of every natural phrasing ("chicken 200g
  // 31p 0c 4f", "peanut butter 32g 190 calories 8g protein"), and it fails only
  // when macros are written before the portion ("31g protein 200g chicken"),
  // which nobody types. The composer previews the computed result live, so a
  // misread is visible before anything is logged.
  let quantity: number | undefined;
  let unit: FoodUnit | undefined;

  const qty = take(
    /(\d+(?:\.\d+)?)\s*(kg|g|grams?|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|x|ct|counts?|pcs?|pieces?|servings?|slices?|scoops?)\b/i,
  );
  if (qty) {
    const value = parseFloat(qty[1]);
    const rawUnit = qty[2].toLowerCase();
    if (/^(kg)$/.test(rawUnit)) {
      quantity = value * 1000;
      unit = 'g';
    } else if (/^(g|grams?)$/.test(rawUnit)) {
      quantity = value;
      unit = 'g';
    } else if (/^(ml)$/.test(rawUnit)) {
      quantity = value;
      unit = 'ml';
    } else if (/^(l|litres?|liters?)$/.test(rawUnit)) {
      quantity = value * 1000;
      unit = 'ml';
    } else if (/^(oz|ounces?)$/.test(rawUnit)) {
      quantity = Math.round(value * OZ_TO_G * 10) / 10;
      unit = 'g';
    } else if (/^(lbs?|pounds?)$/.test(rawUnit)) {
      quantity = Math.round(value * LB_TO_G * 10) / 10;
      unit = 'g';
    } else {
      quantity = value;
      unit = 'count';
    }
  }

  // --- 3. Labelled nutrition ("31g protein", "protein 31", "380 calories") ---
  //
  // Labels are resolved IN ORDER OF APPEARANCE, not in a fixed nutrient order.
  // A fixed order misreads "fat 25 carbs 0": reaching carbs first, its
  // number-before-label form finds "25 carbs" and steals the value that
  // belongs to fat. Walking left to right and consuming each match as it is
  // claimed means every label sees only numbers no earlier label wanted.
  const LABELS = [
    { key: 'calories', words: 'kcals?|calories|cals?' },
    { key: 'proteinG', words: 'protein' },
    { key: 'carbsG', words: 'carbohydrates?|carbs?' },
    { key: 'fatG', words: 'fats?' },
  ] as const;

  const facts: Partial<Record<(typeof LABELS)[number]['key'], number>> = {};
  // No leading \b: the label is frequently welded to its number ("380cal",
  // "579kcal"), and requiring a boundary there hides it from this scan
  // entirely. A label found inside ordinary words ("protein bar", "low fat
  // milk") is harmless — neither adjacency form will find a number for it.
  const appearance = LABELS.map(l => ({
    ...l,
    at: rest.search(new RegExp(`(?:${l.words})\\b`, 'i')),
  }))
    .filter(l => l.at >= 0)
    .sort((a, b) => a.at - b.at);

  for (const label of appearance) {
    const after = take(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*g?\\s*(?:${label.words})\\b`, 'i'));
    if (after) {
      facts[label.key] = num(after[1]);
      continue;
    }
    const before = take(
      new RegExp(`\\b(?:${label.words})\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*g?\\b`, 'i'),
    );
    if (before) facts[label.key] = num(before[1]);
  }

  const calories = facts.calories;
  let proteinG = facts.proteinG;
  let carbsG = facts.carbsG;
  let fatG = facts.fatG;

  // --- 4. Short form ("31p 0c 4f") -----------------------------------------
  // Only after the labelled forms are gone, so "4 fat" can't be re-read as "4f".
  if (proteinG === undefined) proteinG = num(take(/(\d+(?:\.\d+)?)\s*p\b/i)?.[1]);
  if (carbsG === undefined) carbsG = num(take(/(\d+(?:\.\d+)?)\s*c\b/i)?.[1]);
  if (fatG === undefined) fatG = num(take(/(\d+(?:\.\d+)?)\s*f\b/i)?.[1]);

  // --- 5. Bare leading count ("2 eggs") ------------------------------------
  // Last, so a leading number that was really a macro value has already been
  // claimed by its label. Guarded against "2% milk".
  if (quantity === undefined) {
    const lead = take(/^\s*(\d+)\s+(?!%)/);
    if (lead) {
      quantity = parseFloat(lead[1]);
      unit = 'count';
    }
  }

  // --- 6. Multiplier ("… 2x", "… x2") --------------------------------------
  // Deliberately LAST, and this ordering is the whole trick. `2x` is ambiguous:
  // in "banana 2x" it's the amount, in "chicken 200g 31p 0c 4f 2x" it means two
  // of that 200g portion. Running after the quantity step resolves it by what's
  // already been claimed — if a quantity was found, a leftover `2x` can only be
  // a multiplier. The `x2` form is never an amount, so it is always one.
  //
  // Before this existed the token fell through to the name ("chicken 2x") and
  // the entry logged as a SINGLE serving — the silent-half-portion bug.
  let multiplier: number | undefined;
  const multMatch =
    take(/[x×]\s*(\d+(?:\.\d+)?)\b/i) ?? (quantity !== undefined ? take(/(\d+(?:\.\d+)?)\s*[x×]\b/i) : null);
  if (multMatch) {
    const value = parseFloat(multMatch[1]);
    // A multiplier of 0 would erase the entry and an absurd one is a typo, not
    // an instruction. Out-of-range values are ignored rather than clamped —
    // silently logging 100× a meal is worse than ignoring a stray token.
    if (Number.isFinite(value) && value > 0 && value <= 100) multiplier = value;
  }

  if (multiplier !== undefined && quantity !== undefined) {
    quantity = Math.round(quantity * multiplier * 10) / 10;
  }

  // --- 7. Name = the leftovers ---------------------------------------------
  const name = rest
    .replace(/[@,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hasFacts =
    calories !== undefined ||
    proteinG !== undefined ||
    carbsG !== undefined ||
    fatG !== undefined;

  return {
    name,
    quantity,
    unit,
    calories,
    proteinG,
    carbsG,
    fatG,
    basis,
    multiplier,
    hasFacts,
    raw,
  };
}

/**
 * How many "basis units" of the food were eaten, given the basis its numbers
 * are written against. per-100g facts with a 250g quantity → 2.5.
 *
 * The multiplier is folded in once and only once. Where a quantity exists it is
 * ALREADY multiplied (parseFoodQuery does that so the displayed amount reads as
 * the true total), so scales derived from the quantity must not multiply again
 * — double-counting there would quietly log 4× a doubled portion.
 */
export function basisScale(q: FoodQuery): number {
  const multiplier = q.multiplier ?? 1;

  if (q.basis === 'per100') {
    if ((q.unit === 'g' || q.unit === 'ml') && q.quantity) return q.quantity / 100;
    return multiplier;
  }
  if (q.basis === 'perServing') return q.quantity ?? multiplier;
  return multiplier;
}
