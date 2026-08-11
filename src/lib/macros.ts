// src/lib/macros.ts
// Arithmetic on numbers that might not be known.
//
// The app used to store a blank macro as 0, which reads as a claim ("this food
// has no fat") rather than an absence ("I didn't say"). That collapse is what
// produced the bug this redesign started from: with carbs and fat sitting at 0,
// a food described as "540 cal 96 p" could have its calories re-derived as
// 4×96 + 4×0 + 9×0 = 384 and shown with total confidence.
//
// So `undefined` is a first-class value here and it PROPAGATES. Scaling an
// unknown leaves it unknown. Summing a list of values carries the count of
// unknowns alongside the sum, because a total built from an incomplete set is a
// floor, not a total, and every consumer that grades or displays it needs to be
// able to tell the difference.
//
// Nothing in this file ever invents a number.

export type MacroKey = 'calories' | 'proteinG' | 'carbsG' | 'fatG';

export const MACRO_KEYS: MacroKey[] = ['calories', 'proteinG', 'carbsG', 'fatG'];

/** A set of nutrition numbers, any of which may be unknown. */
export type Macros = Partial<Record<MacroKey, number>>;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Scale each known value; unknowns stay unknown. */
export function scaleMacros(m: Macros, factor: number): Macros {
  const out: Macros = {};
  for (const key of MACRO_KEYS) {
    const value = m[key];
    if (value !== undefined) out[key] = round1(value * factor);
  }
  return out;
}

/** Divide each known value; unknowns stay unknown. Guards a zero divisor. */
export function unscaleMacros(m: Macros, divisor: number): Macros {
  return scaleMacros(m, divisor > 0 ? 1 / divisor : 1);
}

export interface MacroTotals {
  /** Sum of the values that ARE known. A floor when `missing` is non-zero. */
  total: Record<MacroKey, number>;
  /** How many contributors had no value for each macro. */
  missing: Record<MacroKey, number>;
}

export function sumMacros(list: Macros[]): MacroTotals {
  const total = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const missing = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const m of list) {
    for (const key of MACRO_KEYS) {
      const value = m[key];
      if (value === undefined) missing[key] += 1;
      else total[key] += value;
    }
  }
  for (const key of MACRO_KEYS) total[key] = round1(total[key]);
  return { total, missing };
}

/** True when at least one macro carries a number. */
export function hasAnyMacro(m: Macros): boolean {
  return MACRO_KEYS.some(k => m[k] !== undefined);
}

/**
 * Parse a form field into a macro value. An empty field is UNKNOWN, which is
 * why this returns undefined rather than 0 — the distinction the whole module
 * exists for starts at the input.
 */
export function parseMacroField(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return round1(n);
}

/** For display: a known number, or an em dash. */
export function showMacro(value: number | undefined, digits = 0): string {
  if (value === undefined) return '—';
  return (digits === 0 ? Math.round(value) : round1(value)).toLocaleString();
}
