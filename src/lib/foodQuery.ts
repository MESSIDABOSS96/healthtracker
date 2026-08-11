// src/lib/foodQuery.ts
// One structured read of whatever the user typed.
//
// The grammar has exactly three parts, and every scenario the app supports is
// some subset of them:
//
//   <name>  [facts]  [per <serving>]  [amount]
//
//   chipotle bowl 540cal 96p            a meal, facts for the whole thing
//   welchs 80cal per packet             a snack, facts for one packet
//   welchs 2                            …two of them, next time
//   chicken breast 165cal 31p per 100g  a food measured by weight
//   chicken breast 1.5                  …1.5 servings of it, next time
//   chicken breast 150g                 …or say the weight and let it divide
//
// The unification that makes this small: FACTS ALWAYS DESCRIBE ONE SERVING, and
// a serving is whatever you say it is — 100 g, one packet, or (by default) the
// whole thing. There is no total-vs-per-amount mode, because a one-off meal is
// just a food whose serving is "1" eaten once. The old parser carried a
// three-valued `basis`, a `basisAmount` and a separate `multiplier` to express
// the same idea, and the interactions between them were where it went wrong.
//
// THE ONE AMBIGUITY, AND ITS RULE. A weight in the text can mean two different
// things — "the facts describe 100 g" or "I ate 150 g" — and nothing about the
// number itself distinguishes them. The rule is:
//
//   facts present  → the first weight is what the facts DESCRIBE (the serving)
//   facts absent   → the weight is how much you ATE
//
// which is exactly how the two are used in practice: you state a serving on the
// day you first enter a food's label, and after that you only ever state
// amounts. An explicit `per`/`/` marker always wins over this inference.
//
// Nothing here touches the network or the database. It is pure and synchronous.

export type FoodUnit = 'g' | 'ml' | 'count';

/** A quantity with a unit. `count` means servings/items, not a weight. */
export interface Amount {
  value: number;
  unit: FoodUnit;
}

export interface FoodInput {
  /** Whatever text was left after the numbers were consumed. */
  name: string;
  /** How much was eaten, if stated. Absent means one serving. */
  amount?: Amount;
  /**
   * What one serving is, if stated. Absent means the food's own serving (for a
   * food already known) or "the whole thing" (for a new one).
   */
  serving?: Amount;
  /** A noun the user used for the serving — "packet", "bar", "slice". */
  servingNoun?: string;
  /** Nutrition for ONE serving. Every field may be absent = unknown. */
  facts: {
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
  /** True when the text carried at least one nutrition number. */
  hasFacts: boolean;
  /** The original input, untouched. */
  raw: string;
}

/** Nobody eats more than this many servings of anything. A bare number above
 *  it is a mislaid figure, not a portion — see the note in step 5. */
const MAX_COUNT = 100;
/** A weight can legitimately be large (1 kg = 1000 g); this is only a typo net. */
const MAX_WEIGHT = 100000;

const OZ_TO_G = 28.35;
const LB_TO_G = 453.592;

/** Serving nouns that mean "one of these". An explicit list rather than
 *  `per <anything>`, because a catch-all reads "chicken per pound" — or a food
 *  with the word "per" in its name — as a serving marker, and getting that
 *  wrong silently rescales every macro. */
const SERVING_NOUNS =
  'servings?|portions?|bars?|slices?|scoops?|pieces?|items?|packs?|packets?|containers?|bottles?|cans?|pots?|tubs?|sachets?|squares?|cookies?|eggs?|bowls?|cups?|plates?|meals?|whole\\s+things?';

const WEIGHT_UNITS = 'kg|g|grams?|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?';

function toAmount(value: number, rawUnit: string): Amount {
  const u = rawUnit.toLowerCase();
  if (/^kg$/.test(u)) return { value: value * 1000, unit: 'g' };
  if (/^(g|grams?)$/.test(u)) return { value, unit: 'g' };
  if (/^ml$/.test(u)) return { value, unit: 'ml' };
  if (/^(l|litres?|liters?)$/.test(u)) return { value: value * 1000, unit: 'ml' };
  if (/^(oz|ounces?)$/.test(u)) return { value: Math.round(value * OZ_TO_G * 10) / 10, unit: 'g' };
  if (/^(lbs?|pounds?)$/.test(u)) return { value: Math.round(value * LB_TO_G * 10) / 10, unit: 'g' };
  return { value, unit: 'count' };
}

export function parseFoodInput(input: string): FoodInput {
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

  // --- 1. Explicit serving marker -----------------------------------------
  // Weight form first: "per 100g" also satisfies the noun pattern via "g".
  let serving: Amount | undefined;
  let servingNoun: string | undefined;

  const perWeight = take(new RegExp(`(?:\\/|\\bper\\s*)(\\d+(?:\\.\\d+)?)\\s*(${WEIGHT_UNITS})\\b`, 'i'));
  if (perWeight) {
    serving = toAmount(parseFloat(perWeight[1]), perWeight[2]);
  } else {
    const perNoun = take(new RegExp(`(?:\\/|\\bper\\s*)(\\d+(?:\\.\\d+)?\\s*)?(${SERVING_NOUNS})\\b`, 'i'));
    if (perNoun) {
      serving = { value: num(perNoun[1]) ?? 1, unit: 'count' };
      servingNoun = perNoun[2].toLowerCase();
    }
  }

  // --- 2. The first weight ------------------------------------------------
  // DELIBERATELY BEFORE THE MACRO LABELS, and this ordering is load-bearing.
  // "salmon 200g calories 400" is the trap: leaving 200g in place lets the
  // number-then-label reader bind it as "200 calories" and log a wrong number
  // in silence. Consuming the weight first makes every remaining label
  // unambiguous as the scan moves left to right.
  //
  // What this weight MEANS — the portion eaten, or the portion the facts
  // describe — is decided in step 5, once we know whether facts turned up.
  let amount: Amount | undefined;
  const weight = take(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${WEIGHT_UNITS})\\b`, 'i'));
  if (weight) amount = toAmount(parseFloat(weight[1]), weight[2]);

  // --- 3. Labelled nutrition ("31g protein", "protein 31", "380 calories") --
  //
  // Resolved IN ORDER OF APPEARANCE, not in a fixed nutrient order. A fixed
  // order misreads "fat 25 carbs 0": reaching carbs first, its number-before-
  // label form finds "25 carbs" and steals the value that belongs to fat.
  // Walking left to right and consuming each match as it is claimed means every
  // label only ever sees numbers no earlier label wanted.
  const LABELS = [
    { key: 'calories', words: 'kcals?|calories|cals?' },
    { key: 'proteinG', words: 'protein' },
    { key: 'carbsG', words: 'carbohydrates?|carbs?' },
    { key: 'fatG', words: 'fats?' },
  ] as const;

  const facts: FoodInput['facts'] = {};
  // No leading \b: the label is frequently welded to its number ("380cal",
  // "579kcal"), and requiring a boundary there hides it from this scan
  // entirely. A label found inside an ordinary word ("protein bar", "low fat
  // milk") is harmless — neither adjacency form will find a number for it.
  const appearance = LABELS.map(l => ({
    ...l,
    at: rest.search(new RegExp(`(?:${l.words})\\b`, 'i')),
  }))
    .filter(l => l.at >= 0)
    .sort((a, b) => a.at - b.at);

  // Assigned only when a value was actually found, so an untouched macro has no
  // key at all rather than a key holding undefined. Same distinction as
  // everywhere else here: absent means unknown.
  const set = (key: keyof typeof facts, value: number | undefined) => {
    if (value !== undefined) facts[key] = value;
  };

  for (const label of appearance) {
    const after = take(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*g?\\s*(?:${label.words})\\b`, 'i'));
    if (after) {
      set(label.key, num(after[1]));
      continue;
    }
    const before = take(
      new RegExp(`\\b(?:${label.words})\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*g?\\b`, 'i'),
    );
    if (before) set(label.key, num(before[1]));
  }

  // --- 4. Short form ("31p 0c 4f") -----------------------------------------
  // Only after the labelled forms are gone, so "4 fat" can't be re-read as "4f".
  if (facts.proteinG === undefined) set('proteinG', num(take(/(\d+(?:\.\d+)?)\s*p\b/i)?.[1]));
  if (facts.carbsG === undefined) set('carbsG', num(take(/(\d+(?:\.\d+)?)\s*c\b/i)?.[1]));
  if (facts.fatG === undefined) set('fatG', num(take(/(\d+(?:\.\d+)?)\s*f\b/i)?.[1]));

  const hasFacts =
    facts.calories !== undefined ||
    facts.proteinG !== undefined ||
    facts.carbsG !== undefined ||
    facts.fatG !== undefined;

  // --- 5. Bare counts ------------------------------------------------------
  // Only if no weight was found above. These forms have no unit to identify
  // them, so they run last, once every number a label wanted has been claimed.
  if (!amount) {
    // "x2" is never anything but a count, in either order.
    const mult = take(/[x×]\s*(\d+(?:\.\d+)?)\b/i) ?? take(/(\d+(?:\.\d+)?)\s*[x×]\b/i);
    if (mult) {
      amount = { value: parseFloat(mult[1]), unit: 'count' };
    } else {
      // A bare trailing number: "welchs 2", "chicken breast 1.5".
      //
      // Two guards, both earning their keep. It must be a WHOLE TOKEN at the
      // end, or "ground beef 90/10" logs itself as ten servings. And it must be
      // a PLAUSIBLE COUNT: "chipotle chicken 540 96p" leaves a bare 540 behind,
      // and reading that as 540 servings would multiply the meal by five
      // hundred. Nobody eats 540 of anything, so a number that large is not a
      // portion — it is a figure whose label got lost, and it stays visibly in
      // the name where the label card shows it rather than being consumed into
      // an amount nobody typed.
      const trailing = rest.match(/\s(\d+(?:\.\d+)?)\s*$/);
      const trailingValue = trailing ? parseFloat(trailing[1]) : NaN;
      if (trailing && trailingValue > 0 && trailingValue <= MAX_COUNT) {
        rest = rest.replace(/\s(\d+(?:\.\d+)?)\s*$/, ' ');
        amount = { value: trailingValue, unit: 'count' };
      } else {
        // A bare leading integer: "2 eggs". Guarded against "2% milk".
        const lead = rest.match(/^\s*(\d+(?:\.\d+)?)\s+(?!%)/);
        const leadValue = lead ? parseFloat(lead[1]) : NaN;
        if (lead && leadValue > 0 && leadValue <= MAX_COUNT) {
          rest = rest.replace(/^\s*(\d+(?:\.\d+)?)\s+(?!%)/, ' ');
          amount = { value: leadValue, unit: 'count' };
        }
      }
    }
  }

  // An amount of zero or worse would erase the entry, and an absurd one is a
  // typo rather than an instruction. Dropped rather than clamped: silently
  // logging 100× a meal is worse than ignoring a stray token.
  if (amount && !(amount.value > 0 && amount.value <= MAX_WEIGHT)) amount = undefined;

  // --- 6. The one ambiguity ------------------------------------------------
  // See the header. With facts in the text and no explicit `per`, a weight is
  // describing those facts, not the portion eaten: "salmon 100g 208cal 25p" is
  // a label being entered, not 100 g being logged.
  if (hasFacts && !serving && amount && amount.unit !== 'count') {
    serving = amount;
    amount = undefined;
  }

  // --- 7. Name = the leftovers ---------------------------------------------
  const name = rest
    .replace(/[@,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { name, amount, serving, servingNoun, facts, hasFacts, raw };
}

/** "100 g" / "1 packet" / "1 (whole thing)" — how a serving reads on screen. */
export function servingLabel(serving: Amount | undefined, noun?: string): string {
  if (!serving) return '1 (whole thing)';
  if (serving.unit === 'count') {
    const word = noun ? noun.replace(/s$/, '') : null;
    return word ? `${serving.value} ${word}` : `${serving.value} (whole thing)`;
  }
  return `${serving.value} ${serving.unit}`;
}
