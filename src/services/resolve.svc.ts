// src/services/resolve.svc.ts
// Turning typed text into something loggable.
//
// This used to be a four-tier cascade — your library, then a bundled 6k-row
// USDA table, then a language model — ordered by how determined the answer
// already was. All of that is gone. The app now knows exactly one source of
// nutrition facts: foods you have entered yourself. Nothing is looked up,
// estimated, or generated.
//
// What that buys is the property the tiers kept undermining: EVERY NUMBER ON
// SCREEN CAME FROM YOU. A tracker whose figures shift between identical meals
// can't show a real trend, and a tier that silently answers a question you
// didn't quite ask (a table row for a food you'd already weighed, a model
// estimate for a name it half-recognised) is indistinguishable from one that
// answered correctly. The cost is real and worth stating: the first time you
// eat a banana, you type its numbers. Every time after, its name is enough.
//
// So there are only two outcomes here — the app knows this food, or it asks.

import { db } from '@/db/db';
import type { Food } from '@/db/schema';
import { normalizeFoodName } from '@/lib/normalizeFoodName';
import { parseFoodInput, servingLabel, type FoodInput } from '@/lib/foodQuery';
import { scaleMacros, type Macros } from '@/lib/macros';
import { servingsFor } from '@/lib/servings';
import { stemWords } from '@/lib/stem';

export interface Match {
  food: Food;
  /** How many servings the typed amount works out to. */
  servings: number;
  /** The food's per-serving macros scaled by `servings`. Unknowns stay unknown. */
  totals: Macros;
  /** "1.5 × 100 g" — what is about to be logged, in words. */
  amountLabel: string;
}

export interface Resolution {
  input: FoodInput;
  /** Foods whose name matches, best first. Empty means the app doesn't know it. */
  matches: Match[];
  /**
   * Set when a name matched but the amount couldn't be applied to it — a weight
   * against a food measured in packets. Carries its own explanation.
   */
  problem?: string;
}

const foodServingLabel = (food: Food): string => {
  const qty = food.servingQty ?? 1;
  const unit = food.servingUnit ?? 'count';
  if (unit === 'count') return food.servingLabel || (qty === 1 ? '1 (whole thing)' : `${qty}`);
  return `${qty} ${unit}`;
};

/** "1.5 × 100 g" / "2 × 1 packet" — always count first, then what one is. */
export function amountLabelFor(food: Food, servings: number): string {
  const rounded = Math.round(servings * 100) / 100;
  return `${rounded} × ${foodServingLabel(food)}`;
}

/**
 * Every word you typed has to appear in the name, in any order — "chicken"
 * finds both "Chicken breast, Tesco" and "Tesco chicken breast", and "tesco
 * chicken" narrows to the one.
 *
 * Both sides go through the same stemmer, so plurals stop deciding whether a
 * food is found: `egg` and `eggs` must reach the same row, or the app appears
 * to forget a food one letter at a time.
 *
 * A personal food list is a few hundred rows at most, so this scans rather than
 * hunting an index. Hidden-from-chips foods deliberately still resolve —
 * dismissing a chip tidies the shortcut row, it doesn't retire the food.
 */
async function matchByName(name: string): Promise<Food[]> {
  const normalized = normalizeFoodName(name);
  if (!normalized) return [];
  const queryTokens = stemWords(normalized);
  if (!queryTokens.length) return [];

  const all = await db.foods.toArray();
  const found = all.filter(f => {
    const nameTokens = stemWords(f.normalizedName);
    return queryTokens.every(qt => nameTokens.some(nt => nt.startsWith(qt)));
  });

  // An exact name match is the one you meant; past that, most-used first — with
  // a handful of foods in heavy rotation, frequency beats alphabetical.
  found.sort((a, b) => {
    const exact = Number(b.normalizedName === normalized) - Number(a.normalizedName === normalized);
    return exact || (b.usageCount ?? 0) - (a.usageCount ?? 0);
  });
  return found.slice(0, 5);
}

/**
 * Read the text and find what it refers to. Safe to call on every keystroke —
 * it touches Dexie and nothing else.
 */
export async function resolveEntry(text: string): Promise<Resolution> {
  const input = parseFoodInput(text);
  if (!input.raw || !input.name) return { input, matches: [] };

  const foods = await matchByName(input.name);
  const matches: Match[] = [];
  let problem: string | undefined;

  for (const food of foods) {
    const result = servingsFor(input.amount, {
      servingQty: food.servingQty,
      servingUnit: food.servingUnit,
    });
    if (!result.ok) {
      // Remembered rather than discarded: a name that matched but couldn't take
      // the amount is a different situation from a name nobody recognises, and
      // telling the user which one they're in is the whole point.
      problem ??= result.reason;
      continue;
    }
    matches.push({
      food,
      servings: result.servings,
      totals: scaleMacros(
        {
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
        },
        result.servings,
      ),
      amountLabel: amountLabelFor(food, result.servings),
    });
  }

  return { input, matches, problem: matches.length ? undefined : problem };
}

/**
 * The starting state of the label card for a food the app doesn't know yet,
 * seeded with whatever the text already carried. An existing food is passed in
 * when the user is correcting one rather than creating one.
 */
export interface LabelDraft {
  /** Set when this edits a food that already exists. */
  foodId?: string;
  name: string;
  servingQty: string;
  servingUnit: string;
  servingNoun?: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  /** How many servings to log once saved. */
  servings: string;
}

export function draftFromInput(input: FoodInput, existing?: Food): LabelDraft {
  const serving =
    input.serving ??
    (existing
      ? { value: existing.servingQty ?? 1, unit: (existing.servingUnit ?? 'count') as 'g' | 'ml' | 'count' }
      : undefined);
  const str = (n: number | undefined) => (n === undefined ? '' : String(n));

  // Facts the user just typed win over the stored ones — they are the more
  // recent statement of the same fact, and the card is where they get checked.
  const facts = input.hasFacts
    ? input.facts
    : {
        calories: existing?.calories,
        proteinG: existing?.proteinG,
        carbsG: existing?.carbsG,
        fatG: existing?.fatG,
      };

  const servings = existing
    ? servingsFor(input.amount, { servingQty: existing.servingQty, servingUnit: existing.servingUnit })
    : servingsFor(input.amount?.unit === 'count' ? input.amount : undefined, {});

  return {
    foodId: existing?.id,
    // The typed name is a SEARCH QUERY, not a statement of fact — unlike the
    // macros below, which the user did type as facts. Once a food has been
    // picked the text that found it has done its job, so the row keeps its own
    // name: "chick" is how you reached "Chicken breast", not what you want it
    // called. Letting the query win renamed the library row on save (and its
    // normalizedName with it), so every past entry and every future match was
    // rewritten to whatever prefix happened to be in the box.
    name: existing?.name || input.name || '',
    servingQty: String(serving?.value ?? 1),
    servingUnit: serving?.unit ?? 'count',
    servingNoun: input.servingNoun,
    calories: str(facts.calories),
    proteinG: str(facts.proteinG),
    carbsG: str(facts.carbsG),
    fatG: str(facts.fatG),
    servings: String(servings.ok ? servings.servings : 1),
  };
}

export { servingLabel };
