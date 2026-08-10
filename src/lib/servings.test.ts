// src/lib/servings.test.ts
// Run with `npm test`.
//
// This covers the two silent failures the library tier used to have: an amount
// the user typed being discarded, and a plural deciding which tier answered.
// Both produced a plausible number, so neither was visible from the screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libraryServings } from './servings.ts';
import { stemToken, stemWords } from './stem.ts';

/** A food stored per 100g — anything the app resolved by weight. */
const perWeight = { servingQty: 100, servingUnit: 'g', lastServings: 0.44 };
/** A food stored per item — anything it counted. */
const perItem = { servingQty: 1, servingUnit: 'count', lastServings: 2 };

test('no amount typed re-logs the usual portion', () => {
  assert.equal(libraryServings({}, perWeight), 0.44);
  assert.equal(libraryServings({}, perItem), 2);
});

test('a bare multiplier scales the usual portion', () => {
  assert.equal(libraryServings({ multiplier: 2 }, perWeight), 0.88);
});

test('a weight against a per-100g row divides', () => {
  assert.equal(libraryServings({ quantity: 250, unit: 'g' }, perWeight), 2.5);
});

test('a count against a per-item row is the count', () => {
  assert.equal(libraryServings({ quantity: 3, unit: 'count' }, perItem), 3);
});

test('a count against a weight-based row means N of your usual portion', () => {
  // "2 egg" once the row is stored per 100g. It logged ONE egg before this —
  // the typed 2 was dropped on the floor with nothing on screen saying so.
  assert.equal(libraryServings({ quantity: 2, unit: 'count' }, perWeight), 0.88);
});

test('a weight against a per-item row is refused, not guessed', () => {
  // Nothing knows what one bar weighs, so the row steps aside and the per-100g
  // table answers instead.
  assert.equal(libraryServings({ quantity: 60, unit: 'g' }, perItem), null);
});

test('an unusable amount never logs zero', () => {
  assert.equal(libraryServings({ quantity: 0, unit: 'g' }, perWeight), 0.44);
});

test('a food never logged before falls back to one serving', () => {
  assert.equal(libraryServings({}, { servingQty: 100, servingUnit: 'g' }), 1);
});

test('the stemmer collapses the plurals that split the tiers', () => {
  assert.equal(stemToken('eggs'), 'egg');
  assert.equal(stemToken('berries'), 'berry');
  assert.equal(stemToken('oats'), 'oat');
  // Short tokens and -ss/-us endings are left alone, or "hummus" becomes
  // "hummu" and stops matching itself.
  assert.equal(stemToken('rice'), 'rice');
  assert.equal(stemToken('hummus'), 'hummus');
  assert.equal(stemToken('couscous'), 'couscous');
});

test('every typed word must appear in the name, plural or not', () => {
  const matches = (name: string, query: string) => {
    const nameTokens = stemWords(name);
    return stemWords(query).every(qt => nameTokens.some(nt => nt.startsWith(qt)));
  };
  assert.equal(matches('egg whole raw fresh', 'eggs'), true);
  assert.equal(matches('egg whole raw fresh', 'egg'), true);
  assert.equal(matches('tesco chicken breast', 'chicken tesco'), true);
  assert.equal(matches('egg whole raw fresh', 'duck egg'), false);
});
