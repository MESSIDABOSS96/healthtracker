// src/lib/closureMath.test.ts
// Run with `npm test`.
//
// These rules decide whether a user's day "counted". The direction logic in
// particular is trivially invertible — swapping the ceiling and the floor still
// typechecks, still renders, and quietly tells someone on a cut that a 3,000
// kcal day was a win. That's what these lock down.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calorieComponent,
  proteinComponent,
  resolveWeightDirection,
  trainingComponent,
} from './closureMath.ts';

// --- direction -------------------------------------------------------------

test('direction derives from target vs start weight', () => {
  assert.equal(resolveWeightDirection({ startWeight: 200, targetWeight: 180 }), 'lose');
  assert.equal(resolveWeightDirection({ startWeight: 160, targetWeight: 180 }), 'gain');
  assert.equal(resolveWeightDirection({ startWeight: 180, targetWeight: 180 }), 'maintain');
  // Within the epsilon — a 0.2lb "goal" is holding, not cutting.
  assert.equal(resolveWeightDirection({ startWeight: 180, targetWeight: 179.8 }), 'maintain');
});

test('an explicit override beats the derivation', () => {
  assert.equal(
    resolveWeightDirection({ startWeight: 200, targetWeight: 180, directionOverride: 'gain' }),
    'gain',
  );
});

test('with nothing set at all, the calorie goal is a ceiling', () => {
  assert.equal(resolveWeightDirection(undefined), 'lose');
  assert.equal(resolveWeightDirection({}), 'lose');
  // A target with no snapshotted start can't be compared to anything.
  assert.equal(resolveWeightDirection({ targetWeight: 180 }), 'lose');
});

// --- protein ---------------------------------------------------------------

test('protein is a floor, credited proportionally', () => {
  assert.deepEqual(proteinComponent(0, 180), { progress: 0, met: false });
  assert.deepEqual(proteinComponent(90, 180), { progress: 0.5, met: false });
  assert.deepEqual(proteinComponent(180, 180), { progress: 1, met: true });
  // Overshooting is fine and caps at full.
  assert.deepEqual(proteinComponent(250, 180), { progress: 1, met: true });
});

test('a near miss looks nearly full and still fails', () => {
  const c = proteinComponent(179, 180);
  assert.ok(c.progress > 0.99);
  assert.equal(c.met, false);
});

test('no protein goal cannot block the day', () => {
  assert.deepEqual(proteinComponent(0, 0), { progress: 1, met: true });
});

// --- calories --------------------------------------------------------------

test('cutting: at or under the goal is a full pass', () => {
  assert.deepEqual(calorieComponent(1200, 2000, 'lose', true), { progress: 1, met: true });
  assert.deepEqual(calorieComponent(2000, 2000, 'lose', true), { progress: 1, met: true });
});

test('cutting: overshooting drains the arc instead of emptying it', () => {
  const slight = calorieComponent(2100, 2000, 'lose', true); // 5% over
  assert.equal(slight.met, false);
  assert.ok(slight.progress > 0.7 && slight.progress < 1);

  const bad = calorieComponent(2500, 2000, 'lose', true); // 25% over — the floor
  assert.deepEqual(bad, { progress: 0, met: false });

  const awful = calorieComponent(4000, 2000, 'lose', true);
  assert.deepEqual(awful, { progress: 0, met: false });
});

test('bulking: the goal is a floor, and under it is the failure', () => {
  assert.deepEqual(calorieComponent(3000, 2500, 'gain', true), { progress: 1, met: true });
  assert.deepEqual(calorieComponent(2500, 2500, 'gain', true), { progress: 1, met: true });
  const under = calorieComponent(1250, 2500, 'gain', true);
  assert.deepEqual(under, { progress: 0.5, met: false });
});

test('the same day passes on a bulk and fails on a cut', () => {
  // 2400 against a 2000 goal — this is the whole reason direction exists.
  assert.equal(calorieComponent(2400, 2000, 'lose', true).met, false);
  assert.equal(calorieComponent(2400, 2000, 'gain', true).met, true);
});

test('maintaining: a band, not a line', () => {
  assert.equal(calorieComponent(2000, 2000, 'maintain', true).met, true);
  assert.equal(calorieComponent(1850, 2000, 'maintain', true).met, true); // -7.5%
  assert.equal(calorieComponent(2150, 2000, 'maintain', true).met, true); // +7.5%
  assert.equal(calorieComponent(1700, 2000, 'maintain', true).met, false); // -15%
  assert.equal(calorieComponent(2300, 2000, 'maintain', true).met, false); // +15%
});

test('an unlogged day never gets calorie credit', () => {
  // The trap: 0 kcal is technically "under" a cutting goal. Logging nothing
  // must not read as a perfect day.
  assert.deepEqual(calorieComponent(0, 2000, 'lose', false), { progress: 0, met: false });
  assert.deepEqual(calorieComponent(0, 2000, 'maintain', false), { progress: 0, met: false });
  assert.deepEqual(calorieComponent(0, 2000, 'gain', false), { progress: 0, met: false });
});

test('no calorie goal cannot block the day', () => {
  assert.deepEqual(calorieComponent(0, 0, 'lose', false), { progress: 1, met: true });
});

// --- training --------------------------------------------------------------

test('either lift or cardio is a training day', () => {
  assert.deepEqual(trainingComponent(true, false), { progress: 1, met: true });
  assert.deepEqual(trainingComponent(false, true), { progress: 1, met: true });
  assert.deepEqual(trainingComponent(true, true), { progress: 1, met: true });
  assert.deepEqual(trainingComponent(false, false), { progress: 0, met: false });
});

test('a declared rest day closes training fully', () => {
  assert.deepEqual(trainingComponent(false, false, true), { progress: 1, met: true });
});

test('an unmarked day off is still a miss', () => {
  // The point of the rest flag: not-training and declaring-a-rest-day are
  // different days, and only the second one closes.
  assert.deepEqual(trainingComponent(false, false, false), { progress: 0, met: false });
});

test('a session alongside a legacy rest row still reads as done', () => {
  // Writes are mutually exclusive now, but rows predating that rule (or
  // arriving from an older device mid-sync) must not produce a weird verdict.
  assert.deepEqual(trainingComponent(true, false, true), { progress: 1, met: true });
});
