// src/services/foodTable.svc.ts
// Tier 2 of the food resolver: a bundled, offline, per-100g nutrition table
// (USDA SR Legacy — see scripts/build-food-table.mjs).
//
// This exists because "banana" is a LOOKUP, not a generation. Asking a language
// model what's in a banana costs a network round trip and — worse for a tracker
// — returns a slightly different number every time, which turns a week of
// identical breakfasts into a fake trend. A fixed table answers in microseconds
// and answers the same way every time.
//
// The table module is imported dynamically so ~100KB of food data never touches
// first paint. It lands in its own JS chunk, which the service worker precaches
// along with the app (vite.config.ts globPatterns covers js, not json — that's
// why the generator emits a .ts module rather than a .json asset).

import { stemToken } from '@/lib/stem';

export interface TableFood {
  /** USDA description, lightly cleaned. e.g. "Bananas, raw". */
  name: string;
  /** Per 100g. */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Gram weight of one countable portion, when the food has one. */
  portionGrams?: number;
  /** What that portion is. e.g. "medium (7\" to 7-7/8\" long)". */
  portionLabel?: string;
}

interface IndexedFood extends TableFood {
  /**
   * Stemmed CONTENT tokens in order. Position is the ranking signal — USDA
   * writes names most-general-first ("Oil, olive, salad or cooking"), so how
   * early a word appears is how central it is to what the food IS.
   */
  tokens: string[];
}

// ---------------------------------------------------------------------------
// Tokenizing
// ---------------------------------------------------------------------------

// The singularizer moved to lib/stem.ts — unchanged, but now shared with the
// resolver's library scan, which used to match unstemmed and so answered `egg`
// and `eggs` from different tiers.

/** Grammar and packaging words. They pad a name's length without saying
 *  anything about the food, and counting them would penalize USDA's wordier
 *  (often more correct) entries against its terser ones. */
const STOPWORDS = new Set([
  'with', 'without', 'and', 'or', 'of', 'in', 'the', 'a', 'to', 'for',
  'added', 'all', 'from', 'made', 'includes', 'foods', 'program',
  'distribution', 'usda', 'commodity', 'type', 'types', 'variety',
  'varieties', 'commercial', 'unspecified', 'total', 'contents', 'only',
  'regular', 'ready', 'eat', 'other', 'not', 'than', 'per', 'each',
]);

/**
 * Words marking a food that has been transformed into a different thing. An
 * unmatched one of these is a strong signal the entry is not what was meant:
 * "almonds" must not resolve to almond OIL (884 kcal) and "egg" must not
 * resolve to dried YOLK (669 kcal). Both were real results before this existed.
 *
 * The penalty only applies when the user did NOT type the word — "almond oil"
 * matches "oil", so nothing is deducted.
 */
const DERIVATIVE = new Set([
  'oil', 'flour', 'dried', 'dehydrated', 'powder', 'powdered', 'paste',
  'roll', 'nugget', 'breaded', 'syrup', 'chip', 'candie', 'candy', 'cookie',
  'cake', 'pie', 'mix', 'condensed', 'infant', 'baby', 'concentrate',
  'imitation', 'substitute', 'extract', 'meal', 'cracker', 'noodle', 'bran',
  'canned', 'sauce', 'soup', 'juice', 'pudding', 'bar', 'snack',
]);

/**
 * Words marking the PLAIN form of a food. USDA has no "this is the one people
 * mean" flag, and without a counterweight the specificity penalty hands the
 * top slot to whichever name is shortest — which is how "rice" returned "Rice
 * crackers" and "egg" returned the yolk (it beat "Egg, whole, raw, fresh" by
 * one character). These words are exempt from the length penalty AND carry a
 * small bonus, because a name made only of them describes the food itself
 * rather than something made out of it.
 */
const BASIC = new Set(['whole', 'raw', 'fresh', 'cooked']);
const BASIC_BONUS = 0.08;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(stemToken)
    // Bare numbers ("3.25% milkfat" → "3", "25") are noise for the same reason
    // stopwords are.
    .filter(t => t.length > 0 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

// ---------------------------------------------------------------------------
// Lazy load + index
// ---------------------------------------------------------------------------

let indexPromise: Promise<IndexedFood[]> | null = null;

async function loadIndex(): Promise<IndexedFood[]> {
  if (!indexPromise) {
    indexPromise = import('@/data/foodTable').then(({ FOOD_TABLE }) =>
      FOOD_TABLE.split('\n').map(line => {
        const [name, kcal, p, c, f, portionG, portionLabel] = line.split('|');
        return {
          name,
          calories: Number(kcal),
          proteinG: Number(p),
          carbsG: Number(c),
          fatG: Number(f),
          portionGrams: portionG ? Number(portionG) : undefined,
          portionLabel: portionLabel || undefined,
          tokens: tokenize(name),
        };
      }),
    );
  }
  return indexPromise;
}

/**
 * Warm the table in the background. Called when the food composer mounts so
 * the first search is instant rather than paying the chunk fetch + parse.
 * Safe to call repeatedly — the promise is memoized.
 */
export function preloadFoodTable(): void {
  void loadIndex().catch(() => {
    // A failed chunk fetch just means tier 2 is unavailable this session; the
    // resolver falls through to AI. Nothing to surface.
  });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Every query token must match, so "greek yogurt" can't return plain yogurt.
 * Beyond that the ranking is built to answer one question: of the entries that
 * contain what you typed, which is the most CANONICAL rendering of it? That's
 * why unmatched words are penalized — "Bananas, raw" (one spare word) has to
 * beat "Puddings, banana, dry mix, instant, prepared with 2% milk" (seven),
 * even though both legitimately contain "banana".
 */
function score(entry: IndexedFood, queryTokens: string[]): number {
  let total = 0;
  const matchedAt = new Set<number>();

  for (const q of queryTokens) {
    let best = 0;
    let bestIndex = -1;
    for (let i = 0; i < entry.tokens.length; i++) {
      const t = entry.tokens[i];
      let s = 0;
      if (t === q) s = 1;
      else if (t.startsWith(q)) s = 0.6;
      else if (q.startsWith(t) && t.length >= 4) s = 0.4;
      if (s === 0) continue;
      // Earlier is more central. "Oil, olive, …" is olive oil; "Oil, corn,
      // peanut, and olive" is not, and position is the only thing that says so.
      s /= 1 + 0.35 * i;
      if (s > best) {
        best = s;
        bestIndex = i;
      }
    }
    if (best === 0) return -1; // token absent → not a match at all
    total += best;
    matchedAt.add(bestIndex);
  }

  // Every word the user didn't ask for is weighed: preparation states nudge the
  // entry up, transformations push it down, and anything else is dead weight.
  for (let i = 0; i < entry.tokens.length; i++) {
    if (matchedAt.has(i)) continue;
    const token = entry.tokens[i];
    if (BASIC.has(token)) total += BASIC_BONUS;
    else if (DERIVATIVE.has(token)) total -= 0.62;
    else total -= 0.12;
  }

  return total;
}

export async function searchFoodTable(query: string, limit = 5): Promise<TableFood[]> {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const index = await loadIndex();
  const scored: Array<{ entry: IndexedFood; s: number }> = [];
  for (const entry of index) {
    const s = score(entry, queryTokens);
    if (s > 0) scored.push({ entry, s });
  }
  scored.sort((a, b) => b.s - a.s || a.entry.name.length - b.entry.name.length);

  return scored.slice(0, limit).map(({ entry }) => ({
    name: entry.name,
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatG: entry.fatG,
    portionGrams: entry.portionGrams,
    portionLabel: entry.portionLabel,
  }));
}
