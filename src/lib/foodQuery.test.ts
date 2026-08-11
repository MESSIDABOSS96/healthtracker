// src/lib/foodQuery.test.ts
// The parser can be wrong SILENTLY — it always returns something, and a
// misread produces a plausible number rather than an error. That is the entire
// reason this file exists, and why the cases below are the specific ones that
// have bitten rather than a sweep of happy paths.
//
// Run with `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFoodInput } from './foodQuery.ts';

test('the reported bug: an explicit calorie figure is never discarded', () => {
  const q = parseFoodInput('chipotle chicken 540cal 96p');
  assert.equal(q.name, 'chipotle chicken');
  assert.equal(q.facts.calories, 540);
  assert.equal(q.facts.proteinG, 96);
  // The point of the redesign: what wasn't said stays unsaid. Carbs and fat as
  // 0 here is what let calories be re-derived as 4×96 = 384.
  assert.equal(q.facts.carbsG, undefined);
  assert.equal(q.facts.fatG, undefined);
});

test('a bare number next to a labelled macro is not silently eaten', () => {
  // "chipotle chicken 540 96p" — 540 has no unit and no label. It must not
  // vanish into the name without trace, and it must not be read as an amount
  // that would rescale the protein.
  const q = parseFoodInput('chipotle chicken 540 96p');
  assert.equal(q.facts.proteinG, 96);
  assert.equal(q.facts.calories, undefined);
  assert.equal(q.amount, undefined, '540 must not become a portion count');
});

test('facts always describe one serving; an explicit per marker sets it', () => {
  const q = parseFoodInput('chicken breast 165cal 31p 3.6f per 100g');
  assert.equal(q.name, 'chicken breast');
  assert.deepEqual(q.serving, { value: 100, unit: 'g' });
  assert.equal(q.facts.calories, 165);
  assert.equal(q.facts.proteinG, 31);
  assert.equal(q.facts.fatG, 3.6);
  assert.equal(q.amount, undefined);
});

test('per-noun servings: a packet is one of something', () => {
  const q = parseFoodInput('welchs 80cal 0p per packet');
  assert.deepEqual(q.serving, { value: 1, unit: 'count' });
  assert.equal(q.servingNoun, 'packet');
  assert.equal(q.facts.calories, 80);
  assert.equal(q.facts.proteinG, 0, 'an explicit 0 is a real claim, unlike a blank');
});

test('THE ambiguity: with facts and no per marker, a weight is the serving', () => {
  // "salmon 100g 208cal 25p" is a label being entered, not 100 g being logged.
  const q = parseFoodInput('salmon 100g 208cal 25p');
  assert.deepEqual(q.serving, { value: 100, unit: 'g' });
  assert.equal(q.amount, undefined);
});

test('THE ambiguity, other side: with no facts, a weight is the amount', () => {
  const q = parseFoodInput('chicken breast 150g');
  assert.deepEqual(q.amount, { value: 150, unit: 'g' });
  assert.equal(q.serving, undefined);
  assert.equal(q.name, 'chicken breast');
});

test('an explicit per marker outranks the inference', () => {
  const q = parseFoodInput('salmon 208cal 25p 13f per 100g 183g');
  assert.deepEqual(q.serving, { value: 100, unit: 'g' });
  assert.deepEqual(q.amount, { value: 183, unit: 'g' });
});

test('a bare trailing number is a count of servings', () => {
  assert.deepEqual(parseFoodInput('welchs 2').amount, { value: 2, unit: 'count' });
  assert.deepEqual(parseFoodInput('chicken breast 1.5').amount, { value: 1.5, unit: 'count' });
  assert.equal(parseFoodInput('chicken breast 1.5').name, 'chicken breast');
});

test('a number welded into a name is not mistaken for an amount', () => {
  // The trailing-number rule requires a whole token, or "ground beef 90/10"
  // logs itself as ten servings.
  const q = parseFoodInput('ground beef 90/10');
  assert.equal(q.amount, undefined);
  assert.equal(q.name, 'ground beef 90/10');
});

test('nothing stated means nothing assumed', () => {
  const q = parseFoodInput('chipotle bowl');
  assert.equal(q.name, 'chipotle bowl');
  assert.equal(q.amount, undefined);
  assert.equal(q.serving, undefined);
  assert.equal(q.hasFacts, false);
  assert.deepEqual(q.facts, {});
});

test('quantity is consumed before macro labels', () => {
  // Leaving 200g in place lets the number-then-label reader bind it as
  // "200 calories" and log a wrong number in silence.
  const q = parseFoodInput('salmon 200g calories 400');
  assert.equal(q.facts.calories, 400);
  assert.deepEqual(q.serving, { value: 200, unit: 'g' });
});

test('labels resolve in order of appearance, not in nutrient order', () => {
  // A fixed order misreads this: carbs, reached first, finds "25 carbs" via its
  // number-before-label form and steals the value that belongs to fat.
  const q = parseFoodInput('cheese 200cal fat 25 carbs 0');
  assert.equal(q.facts.fatG, 25);
  assert.equal(q.facts.carbsG, 0);
});

test('short form only runs after labelled forms are gone', () => {
  const q = parseFoodInput('mix 100cal 4 fat 10c');
  assert.equal(q.facts.fatG, 4, '"4 fat" must not be re-read as "4f"');
  assert.equal(q.facts.carbsG, 10);
});

test('x2 and 2x are counts, wherever they sit', () => {
  assert.deepEqual(parseFoodInput('protein bar x2').amount, { value: 2, unit: 'count' });
  assert.deepEqual(parseFoodInput('protein bar 2x').amount, { value: 2, unit: 'count' });
});

test('units convert to grams and millilitres', () => {
  assert.deepEqual(parseFoodInput('chicken 6oz').amount, { value: 170.1, unit: 'g' });
  assert.deepEqual(parseFoodInput('milk 1l').amount, { value: 1000, unit: 'ml' });
  assert.deepEqual(parseFoodInput('rice 1kg').amount, { value: 1000, unit: 'g' });
});

test('an absurd or zero amount is dropped, never clamped', () => {
  // Silently logging 500000× a meal is worse than ignoring a stray token.
  assert.equal(parseFoodInput('rice 0').amount, undefined);
  assert.equal(parseFoodInput('rice 500000').amount, undefined);
});

test('a leading count still works', () => {
  const q = parseFoodInput('2 eggs');
  assert.deepEqual(q.amount, { value: 2, unit: 'count' });
  assert.equal(q.name, 'eggs');
});

test('2% milk is not two servings of milk', () => {
  const q = parseFoodInput('2% milk');
  assert.equal(q.amount, undefined);
  assert.equal(q.name, '2% milk');
});
