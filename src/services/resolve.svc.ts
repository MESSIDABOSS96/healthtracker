// src/services/resolve.svc.ts
// The food resolver — one entry point that turns typed text into nutrition,
// routed by what the text actually contains rather than by what's configured.
//
//   facts in the text   → arithmetic          calculator   ~0ms
//   name you've logged  → your own library    library      ~0ms
//   name we know        → bundled USDA table  table        ~0ms
//   none of the above   → language model      ai           1-3s
//
// The tiers are ordered by how much the answer is ALREADY DETERMINED. Explicit
// numbers off a label beat a database; a food the user has personally confirmed
// beats a generic average; a fixed table beats a model that returns 109 kcal
// for a banana today and 105 tomorrow. That last point is the accuracy argument
// as much as the speed one — a tracker whose numbers drift between identical
// meals can't show a real trend.
//
// TRANSACTION RULE (CLAUDE.md #1): resolveWithAI performs a network fetch. It
// must complete before any Dexie write begins — never call it inside a
// db.transaction.

import { db } from '@/db/db';
import type { Food } from '@/db/schema';
import { normalizeFoodName } from '@/lib/normalizeFoodName';
import { basisScale, parseFoodQuery, type FoodQuery } from '@/lib/foodQuery';
import { getLastServingsForFood } from './meals.svc';
import { searchFoodTable, type TableFood } from './foodTable.svc';
import { parseFood, type ParsedFood } from './parse.svc';

export type ResolveTier = 'calculator' | 'library' | 'table' | 'ai';

export interface Resolution {
  tier: ResolveTier;
  parsed: ParsedFood;
  /**
   * Set when the answer came straight off a library row. The UI logs these via
   * logMeal rather than logParsedFood, so a re-log doesn't rewrite the row's
   * stored facts with numbers derived back out of them.
   */
  libraryFood?: Food;
  libraryServings?: number;
}

/** Tiers whose answer is arithmetic on known values — no model, no guessing. */
export function isDeterministic(tier: ResolveTier): boolean {
  return tier !== 'ai';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Calculator — the text carried its own numbers
// ---------------------------------------------------------------------------

function fromCalculator(q: FoodQuery): Resolution {
  const scale = basisScale(q);
  const proteinG = round1((q.proteinG ?? 0) * scale);
  const carbsG = round1((q.carbsG ?? 0) * scale);
  const fatG = round1((q.fatG ?? 0) * scale);
  // Derive calories from the macros when the label didn't state them — that's
  // the 4/4/9 arithmetic the user would otherwise do on a phone calculator.
  const calories =
    q.calories !== undefined
      ? round1(q.calories * scale)
      : round1(4 * proteinG + 4 * carbsG + 9 * fatG);

  return {
    tier: 'calculator',
    parsed: {
      name: q.name || 'Food',
      // "protein bar 210cal 20p 22c 7f x2" names no amount, so the multiplier
      // IS the amount: two bars, not one bar with doubled macros.
      quantity: q.quantity ?? q.multiplier ?? 1,
      unit: q.unit ?? 'count',
      calories,
      proteinG,
      carbsG,
      fatG,
      source: 'local',
    },
  };
}

// ---------------------------------------------------------------------------
// Library — a food this user has already confirmed
// ---------------------------------------------------------------------------

async function fromLibrary(q: FoodQuery): Promise<Resolution[]> {
  const normalized = normalizeFoodName(q.name);
  if (!normalized) return [];

  // Exact match first, then prefix. Substring matching is deliberately absent:
  // it's the same false-merge risk the auto-library dedupe already refuses.
  const exact = await db.foods.where('normalizedName').equals(normalized).toArray();
  const prefix = await db.foods
    .where('normalizedName')
    .startsWith(normalized)
    .limit(6)
    .toArray();

  const seen = new Set<string>();
  const foods: Food[] = [];
  for (const f of [...exact, ...prefix]) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    foods.push(f);
  }
  if (!foods.length) return [];

  // Most-used first — with two people eating the same twelve things, frequency
  // is a better prior than alphabetical.
  foods.sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));

  return Promise.all(foods.slice(0, 5).map(food => toLibraryResolution(food, q)));
}

async function toLibraryResolution(food: Food, q: FoodQuery): Promise<Resolution> {
  const servingQty = food.servingQty ?? 1;
  const servingUnit = food.servingUnit ?? 'count';

  let servings: number;
  if (q.quantity !== undefined && q.unit === servingUnit && servingQty > 0) {
    servings = q.quantity / servingQty;
  } else if (q.quantity !== undefined && q.unit === 'count' && servingUnit === 'count') {
    servings = q.quantity;
  } else {
    // No amount typed — reuse whatever this food was logged as last time. Same
    // semantics as tapping its quick-log chip. A bare multiplier scales that:
    // "protein shake x2" is two of your usual shake.
    servings = ((await getLastServingsForFood(food.id)) ?? 1) * (q.multiplier ?? 1);
  }
  if (!(servings > 0)) servings = 1;

  return {
    tier: 'library',
    libraryFood: food,
    libraryServings: servings,
    parsed: {
      name: food.name,
      quantity: round1(servingQty * servings),
      unit: servingUnit,
      calories: round1(food.calories * servings),
      proteinG: round1(food.proteinG * servings),
      carbsG: round1(food.carbsG * servings),
      fatG: round1(food.fatG * servings),
      source: 'local',
    },
  };
}

// ---------------------------------------------------------------------------
// Table — the bundled USDA data, per 100g
// ---------------------------------------------------------------------------

function fromTable(entry: TableFood, q: FoodQuery): Resolution | null {
  let grams: number;
  if (q.unit === 'g' || q.unit === 'ml') {
    grams = q.quantity ?? 100;
  } else if (q.unit === 'count') {
    // "2 eggs" only resolves if the table knows what one egg weighs.
    if (!entry.portionGrams) return null;
    grams = entry.portionGrams * (q.quantity ?? 1);
  } else {
    // No amount given: one typical portion if there is one, else 100g — times
    // any bare multiplier, so "banana x2" is two bananas.
    grams = (entry.portionGrams ?? 100) * (q.multiplier ?? 1);
  }
  if (!(grams > 0)) return null;

  const scale = grams / 100;
  const count = q.multiplier ?? 1;
  const assumption =
    q.quantity === undefined && entry.portionGrams
      ? `Assumed ${count === 1 ? 'one' : count} × ${entry.portionLabel ?? 'portion'} (${entry.portionGrams}g each).`
      : q.quantity === undefined
        ? `Assumed ${round1(grams)}g — set the amount if that's not right.`
        : undefined;

  return {
    tier: 'table',
    parsed: {
      name: entry.name,
      quantity: round1(grams),
      unit: 'g',
      calories: round1(entry.calories * scale),
      proteinG: round1(entry.proteinG * scale),
      carbsG: round1(entry.carbsG * scale),
      fatG: round1(entry.fatG * scale),
      assumptions: assumption,
      source: 'table',
    },
  };
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/**
 * Everything that can be answered without a network call, ranked. Safe to call
 * on every keystroke — it touches Dexie and an in-memory index, nothing else.
 * An empty array means only the model can answer this one.
 */
export async function resolveInstant(text: string): Promise<Resolution[]> {
  const q = parseFoodQuery(text);
  if (!q.raw) return [];

  // Explicit numbers win outright. Someone reading a label off a packet has
  // better information than any database, and second-guessing them with a
  // lookup would be actively wrong.
  if (q.hasFacts) return [fromCalculator(q)];
  if (!q.name) return [];

  const [library, table] = await Promise.all([
    fromLibrary(q),
    searchFoodTable(q.name, 6).catch(() => [] as TableFood[]),
  ]);

  const results = [...library];
  const seen = new Set(library.map(r => normalizeFoodName(r.parsed.name)));
  for (const entry of table) {
    const resolution = fromTable(entry, q);
    if (!resolution) continue;
    const key = normalizeFoodName(resolution.parsed.name);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(resolution);
  }
  return results.slice(0, 6);
}

/**
 * Tier 3. Only reached when nothing local matched, or when the user explicitly
 * asks for it. Throws ParseError — the caller surfaces the message.
 */
export async function resolveWithAI(text: string): Promise<Resolution> {
  const parsed = await parseFood(text);
  return { tier: 'ai', parsed };
}
