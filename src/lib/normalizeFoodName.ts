// src/lib/normalizeFoodName.ts
// Auto-library dedupe key: exact-match on a normalized name only — deliberately
// NO fuzzy/semantic matching (false-positive merges corrupt the library).
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation, keep letters/digits/spaces
    .replace(/\s+/g, ' ')
    .trim();
}
