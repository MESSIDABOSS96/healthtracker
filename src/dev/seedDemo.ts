// src/dev/seedDemo.ts
//
// Demo fixture: ~17 weeks of plausible logs, so the Dashboard charts, the
// closure grid and the goal projections can be looked at and poked before any
// real data exists.
//
// Run it with `npm run dev:demo`, which serves on port 5174. That port matters:
// IndexedDB is scoped per ORIGIN, and a different port is a different origin,
// so the demo database is a completely separate store from the real one on
// 5173. Seeding here can't touch your actual logs.
//
// Everything is generated from a fixed PRNG seed, so the same fixture comes
// back on every reload — a chart that reshuffles each refresh is useless for
// judging whether the chart is any good.
//
// This module is imported dynamically behind `import.meta.env.DEV`, so it is
// tree-shaken out of production builds.

import { db } from '@/db/db';
import type { DailyCheckin, Food, MealEntry, WeightEntry } from '@/db/schema';
import { addDays, keyToDate } from '@/lib/dayKey';
import { normalizeFoodName } from '@/lib/normalizeFoodName';

const DAYS = 119; // 17 weeks — enough for "3 months" and a real "All" range

/** mulberry32 — small deterministic PRNG so the fixture is reproducible. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-serving nutrition, i.e. what a Food row holds. */
const FOOD_FIXTURES: Array<{
  name: string;
  servingLabel: string;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Relative pick weight — higher shows up more, which drives Frequent. */
  weight: number;
}> = [
  { name: 'Greek yogurt', servingLabel: '170 g', servingQty: 170, servingUnit: 'g', calories: 100, proteinG: 17, carbsG: 6, fatG: 0.7, weight: 9 },
  { name: 'Oatmeal', servingLabel: '80 g dry', servingQty: 80, servingUnit: 'g', calories: 303, proteinG: 10.5, carbsG: 54, fatG: 5.4, weight: 8 },
  { name: 'Banana', servingLabel: '1 medium', servingQty: 1, servingUnit: 'count', calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, weight: 7 },
  { name: 'Whole eggs', servingLabel: '1 large', servingQty: 1, servingUnit: 'count', calories: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8, weight: 8 },
  { name: 'Chicken breast', servingLabel: '100 g', servingQty: 100, servingUnit: 'g', calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, weight: 12 },
  { name: 'White rice', servingLabel: '100 g cooked', servingQty: 100, servingUnit: 'g', calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, weight: 10 },
  { name: 'Ground beef 90/10', servingLabel: '113 g', servingQty: 113, servingUnit: 'g', calories: 199, proteinG: 22.6, carbsG: 0, fatG: 11.3, weight: 6 },
  { name: 'Salmon fillet', servingLabel: '140 g', servingQty: 140, servingUnit: 'g', calories: 291, proteinG: 39, carbsG: 0, fatG: 13, weight: 4 },
  { name: 'Sweet potato', servingLabel: '150 g', servingQty: 150, servingUnit: 'g', calories: 129, proteinG: 2.4, carbsG: 30, fatG: 0.2, weight: 5 },
  { name: 'Broccoli', servingLabel: '150 g', servingQty: 150, servingUnit: 'g', calories: 51, proteinG: 4.2, carbsG: 10, fatG: 0.5, weight: 6 },
  { name: 'Olive oil', servingLabel: '1 tbsp', servingQty: 1, servingUnit: 'count', calories: 119, proteinG: 0, carbsG: 0, fatG: 13.5, weight: 6 },
  { name: 'Whey protein', servingLabel: '1 scoop', servingQty: 1, servingUnit: 'count', calories: 120, proteinG: 24, carbsG: 3, fatG: 1.5, weight: 9 },
  { name: 'Almonds', servingLabel: '28 g', servingQty: 28, servingUnit: 'g', calories: 164, proteinG: 6, carbsG: 6.1, fatG: 14.2, weight: 5 },
  { name: 'Protein bar', servingLabel: '1 bar', servingQty: 1, servingUnit: 'count', calories: 210, proteinG: 20, carbsG: 23, fatG: 7, weight: 4 },
  { name: 'Burrito bowl', servingLabel: '1 bowl', servingQty: 1, servingUnit: 'count', calories: 720, proteinG: 42, carbsG: 78, fatG: 25, weight: 3 },
  { name: 'Pizza slice', servingLabel: '1 slice', servingQty: 1, servingUnit: 'count', calories: 285, proteinG: 12, carbsG: 36, fatG: 10, weight: 2 },
];

function pickWeighted<T extends { weight: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export async function seedDemo(todayKey: string): Promise<void> {
  const rng = makeRng(20260808);
  const startKey = addDays(todayKey, -(DAYS - 1));
  const nowMs = Date.now();

  // ---- Foods -------------------------------------------------------------
  const foods: Food[] = FOOD_FIXTURES.map((f, i) => ({
    id: `demo-food-${i}`,
    name: f.name,
    normalizedName: normalizeFoodName(f.name),
    calories: f.calories,
    proteinG: f.proteinG,
    carbsG: f.carbsG,
    fatG: f.fatG,
    servingLabel: f.servingLabel,
    servingQty: f.servingQty,
    servingUnit: f.servingUnit,
    parseSource: 'ai',
    usageCount: 0, // filled in from the meals generated below
    lastUsedAt: 0,
    createdAt: nowMs - DAYS * 86_400_000,
  }));

  // ---- Meals, check-ins, weigh-ins ---------------------------------------
  const meals: MealEntry[] = [];
  const checkins: DailyCheckin[] = [];
  const weights: WeightEntry[] = [];

  // Weight drifts from 198 → about 181 with day-to-day water noise, so the EMA
  // trend line has something to smooth and the goal projection has a real rate.
  const startWeight = 198;
  const endWeight = 181.4;

  for (let d = 0; d < DAYS; d++) {
    const dayKey = addDays(startKey, d);
    const isToday = dayKey === todayKey;
    const dow = (keyToDate(dayKey).getDay() + 6) % 7; // 0 = Monday
    const progress = d / (DAYS - 1);
    const dayStartMs = keyToDate(dayKey).getTime();

    // --- weigh-in: ~85% of days, skewed to skipping weekends
    if (rng() < (dow >= 5 ? 0.6 : 0.93)) {
      const trend = startWeight + (endWeight - startWeight) * progress;
      const noise = (rng() - 0.5) * 2.4;
      weights.push({
        dayKey,
        weight: Math.round((trend + noise) * 10) / 10,
        loggedAt: dayStartMs + 7 * 3_600_000,
      });
    }

    // --- training: lifts Mon/Tue/Thu/Fri, cardio Wed/Sat/Sun, with real misses.
    //
    // Cardio ALSO lands on some lift days, and that is load-bearing rather than
    // flavour: a day only closes with food AND lift AND cardio, so splitting
    // the two across mutually exclusive weekdays made `closed` unreachable and
    // the demo dashboard read "0 in 6 months" — the app's whole point, broken,
    // in the fixture built to show it off.
    const liftDay = dow === 0 || dow === 1 || dow === 3 || dow === 4;
    const cardioDay = dow === 2 || dow === 5 || dow === 6;
    const didLift = liftDay && rng() < 0.86;
    if (didLift) {
      checkins.push({ dayKey, kind: 'lift', source: 'manual', loggedAt: dayStartMs + 18 * 3_600_000 });
    }
    // Today deliberately leaves cardio open, so the ring lands on 2/3 and you
    // can watch it close by tapping the Cardio tile.
    const didCardio = !isToday && (cardioDay ? rng() < 0.78 : didLift && rng() < 0.62);
    if (didCardio) {
      checkins.push({ dayKey, kind: 'cardio', source: 'manual', loggedAt: dayStartMs + 19 * 3_600_000 });
    }

    // --- meals: ~88% of days logged, 3–5 entries
    if (rng() > 0.12) {
      const count = 3 + Math.floor(rng() * 3);
      for (let m = 0; m < count; m++) {
        const fixtureIndex = FOOD_FIXTURES.indexOf(pickWeighted(FOOD_FIXTURES, rng));
        const food = foods[fixtureIndex];
        const servings = Math.round((0.75 + rng() * 1.6) * 4) / 4; // quarter-serving steps
        const loggedAt = dayStartMs + (7 + m * 3.5) * 3_600_000;

        meals.push({
          id: `demo-meal-${d}-${m}`,
          dayKey,
          foodId: food.id,
          servings,
          loggedAt,
          computedCalories: Math.round((food.calories ?? 0) * servings * 10) / 10,
          computedProteinG: Math.round((food.proteinG ?? 0) * servings * 10) / 10,
          computedCarbsG: Math.round((food.carbsG ?? 0) * servings * 10) / 10,
          computedFatG: Math.round((food.fatG ?? 0) * servings * 10) / 10,
        });

        food.usageCount += 1;
        food.lastUsedAt = Math.max(food.lastUsedAt, loggedAt);
      }
    }
  }

  // Any food that never got picked would sort oddly in Recent; give it a
  // plausible floor rather than a 1970 timestamp.
  for (const food of foods) {
    if (food.lastUsedAt === 0) food.lastUsedAt = food.createdAt;
  }

  // ---- Write. Every await below is a Dexie call (Pitfall #1). -------------
  await db.transaction(
    'rw',
    [db.foods, db.mealEntries, db.dailyCheckins, db.weightEntries, db.goals, db.longTermGoals],
    async () => {
      await db.foods.bulkPut(foods);
      await db.mealEntries.bulkPut(meals);
      await db.dailyCheckins.bulkPut(checkins);
      await db.weightEntries.bulkPut(weights);

      await db.goals.put({
        id: 'singleton',
        calories: 2200,
        proteinG: 180,
        carbsG: 180,
        fatG: 65,
        weightUnit: 'lb',
        updatedAt: nowMs,
      });

      await db.longTermGoals.put({
        id: 'singleton',
        targetWeight: 175,
        startWeight,
        startDayKey: startKey,
        targetDate: addDays(todayKey, 56),
        liftsPerWeek: 4,
        cardioPerWeek: 3,
        updatedAt: nowMs,
      });
    },
  );
}

/** Drop every demo-relevant table, then re-seed. Exposed as window.__demoReseed. */
export async function resetDemo(todayKey: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.foods, db.mealEntries, db.dailyCheckins, db.weightEntries, db.goals, db.longTermGoals],
    async () => {
      await db.mealEntries.clear();
      await db.foods.clear();
      await db.dailyCheckins.clear();
      await db.weightEntries.clear();
      await db.longTermGoals.clear();
    },
  );
  await seedDemo(todayKey);
}
