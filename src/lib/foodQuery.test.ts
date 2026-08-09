// src/lib/foodQuery.test.ts
// Run with `npm test` (node's built-in runner + type stripping — no deps).
//
// This file exists because foodQuery is the one place in the app that can be
// WRONG SILENTLY. A slow parse is annoying; a parse that reads "salmon 200g
// calories 400" as 200 calories writes a plausible wrong number into the log
// and the user never sees it. Every case below is a phrasing that broke during
// development — the ordering rules in foodQuery.ts are load-bearing, not style.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFoodQuery, basisScale } from './foodQuery.ts';

function expect(input: string, fields: Partial<ReturnType<typeof parseFoodQuery>>) {
  const got = parseFoodQuery(input) as Record<string, unknown>;
  for (const [key, value] of Object.entries(fields)) {
    assert.equal(got[key], value, `${input} → ${key}`);
  }
}

test('name only — no facts, nothing to calculate', () => {
  expect('banana', { name: 'banana', hasFacts: false, quantity: undefined });
});

test('name + weight — a lookup with a scale factor', () => {
  expect('banana 120g', { name: 'banana', quantity: 120, unit: 'g', hasFacts: false });
});

test('short-form macros with per-100g basis', () => {
  expect('chicken 200g 31p 0c 4f /100g', {
    name: 'chicken',
    quantity: 200,
    unit: 'g',
    proteinG: 31,
    carbsG: 0,
    fatG: 4,
    basis: 'per100',
    hasFacts: true,
  });
  assert.equal(basisScale(parseFoodQuery('chicken 200g 31p 0c 4f /100g')), 2);
});

test('calories welded to their label', () => {
  expect('oats 80g 380cal', { name: 'oats', quantity: 80, calories: 380 });
  expect('almonds 28g 579kcal 21.2p 21.6c 49.9f per 100g', {
    name: 'almonds',
    quantity: 28,
    calories: 579,
    proteinG: 21.2,
    basis: 'per100',
  });
});

test('label-before-number phrasing', () => {
  // The quantity must be consumed first or "200g calories" reads as 200 kcal.
  expect('salmon 200g calories 400 protein 40 fat 25 carbs 0', {
    name: 'salmon',
    quantity: 200,
    unit: 'g',
    calories: 400,
    proteinG: 40,
    carbsG: 0,
    fatG: 25,
  });
  // Labels must resolve in order of appearance, or carbs steals fat's 25.
  expect('chicken 150g protein 31 carbs 0 fat 3.6 kcal 165 /100g', {
    quantity: 150,
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    basis: 'per100',
  });
});

test('number-before-label phrasing', () => {
  expect('greek yogurt 200g 10g protein 4g carbs 0g fat', {
    name: 'greek yogurt',
    quantity: 200,
    proteinG: 10,
    carbsG: 4,
    fatG: 0,
  });
  expect('yogurt 170g 100 cal 17 protein 6 carbs 0 fat', {
    quantity: 170,
    calories: 100,
    proteinG: 17,
    carbsG: 6,
    fatG: 0,
  });
});

test('mixed phrasing in one line', () => {
  expect('peanut butter 32g 190 calories 8g protein 6g carbs 16g fat', {
    name: 'peanut butter',
    quantity: 32,
    calories: 190,
    proteinG: 8,
    carbsG: 6,
    fatG: 16,
  });
});

test('unit conversion', () => {
  expect('chicken breast 8oz', { name: 'chicken breast', quantity: 226.8, unit: 'g' });
  expect('1 lb ground beef', { name: 'ground beef', quantity: 453.6, unit: 'g' });
  expect('milk 1l', { name: 'milk', quantity: 1000, unit: 'ml' });
  expect('rice 150 g', { name: 'rice', quantity: 150, unit: 'g' });
});

test('counts', () => {
  expect('2 eggs', { name: 'eggs', quantity: 2, unit: 'count' });
  expect('2 eggs 140cal', { name: 'eggs', quantity: 2, unit: 'count', calories: 140 });
  expect('bread 2 slices', { name: 'bread', quantity: 2, unit: 'count' });
  expect('protein bar 1x 210cal 20p 22c 7f', {
    name: 'protein bar',
    quantity: 1,
    unit: 'count',
    calories: 210,
    proteinG: 20,
  });
});

test('a percentage in a name is not a count', () => {
  expect('2% milk 250ml', { name: '2% milk', quantity: 250, unit: 'ml' });
});

test('per-serving basis scales by the number of servings', () => {
  const q = parseFoodQuery('cereal 2 servings per serving 240 calories');
  assert.equal(q.basis, 'perServing');
  assert.equal(q.quantity, 2);
  assert.equal(basisScale(q), 2);
});

// --- multipliers -----------------------------------------------------------
// `2x` used to fall through to the NAME ("chicken 2x") and log a single
// serving — half of what was typed, with nothing on screen to say so.

test('a trailing multiplier doubles amount and macros', () => {
  const q = parseFoodQuery('chicken 200g 31p 0c 4f 2x');
  assert.equal(q.name, 'chicken');
  assert.equal(q.quantity, 400);
  assert.equal(q.unit, 'g');
  assert.equal(q.multiplier, 2);
  assert.equal(basisScale(q), 2); // total basis → macros scale by the multiplier
});

test('the x-first form works too', () => {
  const q = parseFoodQuery('chicken 200g 31p 0c 4f x2');
  assert.equal(q.name, 'chicken');
  assert.equal(q.quantity, 400);
  assert.equal(q.multiplier, 2);
  assert.equal(basisScale(q), 2);
});

test('a multiplier with no amount is the amount', () => {
  const q = parseFoodQuery('protein bar 210cal 20p 22c 7f x2');
  assert.equal(q.name, 'protein bar');
  assert.equal(q.quantity, undefined);
  assert.equal(q.multiplier, 2);
  assert.equal(basisScale(q), 2);
});

test('a bare Nx is still an amount when nothing else claims one', () => {
  // "banana 2x" means two bananas — NOT one banana times two.
  const q = parseFoodQuery('banana 2x');
  assert.equal(q.name, 'banana');
  assert.equal(q.quantity, 2);
  assert.equal(q.unit, 'count');
  assert.equal(q.multiplier, undefined);
});

test('the multiplier is folded in exactly once with per-100g facts', () => {
  // 200g × 2 = 400g of a food whose facts are per 100g → scale 4, not 8.
  const q = parseFoodQuery('chicken 200g 31p 0c 4f /100g 2x');
  assert.equal(q.quantity, 400);
  assert.equal(q.basis, 'per100');
  assert.equal(basisScale(q), 4);
});

test('absurd or empty multipliers are ignored, not applied', () => {
  assert.equal(parseFoodQuery('chicken 200g 31p 0c 4f x0').multiplier, undefined);
  assert.equal(parseFoodQuery('chicken 200g 31p 0c 4f x500').multiplier, undefined);
});

test('half portions work', () => {
  const q = parseFoodQuery('pizza slice 285cal 12p 36c 10f x1.5');
  assert.equal(q.multiplier, 1.5);
  assert.equal(basisScale(q), 1.5);
});

// --- per-serving phrasings --------------------------------------------------

test('per-serving facts scale by how many servings you had', () => {
  for (const phrase of [
    'per serving', '/serving', 'per portion', 'per bar', 'per scoop',
    'per pot', 'per tub', 'per slice', 'per packet', 'per square',
  ]) {
    const q = parseFoodQuery(`cereal 2 servings ${phrase} 240 calories`);
    assert.equal(q.basis, 'perServing', phrase);
    assert.equal(basisScale(q), 2, phrase);
  }
});

test('per-serving facts combine with a multiplier', () => {
  const q = parseFoodQuery('protein bar per bar 210cal 20p 22c 7f x3');
  assert.equal(q.basis, 'perServing');
  assert.equal(q.multiplier, 3);
  assert.equal(basisScale(q), 3);
});

test('per 100g still beats the per-serving patterns', () => {
  // "per 100g" also matches nothing in the serving list, but the ordering
  // matters if that list ever grows a unit-like word.
  assert.equal(parseFoodQuery('chicken 200g 31p 0c 4f per 100g').basis, 'per100');
});

test('label words inside a food name claim no numbers', () => {
  expect('low fat milk 250ml', { name: 'low fat milk', quantity: 250, fatG: undefined });
  expect('protein bar', { name: 'protein bar', hasFacts: false });
});
