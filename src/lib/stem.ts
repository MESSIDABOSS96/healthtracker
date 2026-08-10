// src/lib/stem.ts
// One crude singularizer, shared by the two places that MATCH a typed name
// against stored names: the bundled table's search index and the library scan
// in the food resolver.
//
// It lives here rather than inside either of them because the two disagreeing
// is a bug the user reads as "the app forgot my food". The table stemmed, so
// `eggs` found the USDA row; the library's raw per-token prefix test did not
// ('egg'.startsWith('eggs') is false), so the same query missed the row the
// user had already weighed and confirmed. One letter decided which tier
// answered, and the tiers return different numbers for the same food.
//
// This is NOT normalizeFoodName. That one is the auto-library's dedupe KEY: its
// output is written to `foods.normalizedName` and compared against stored rows,
// so changing what it produces re-identifies existing foods. Stemming is for
// matching only — nothing here is ever written down, so it is free to be
// aggressive. It only has to be applied to both sides consistently and to avoid
// collapsing genuinely different foods together.

/**
 * Make "banana" and "Bananas" collide. Linguistic correctness is explicitly not
 * the goal; any consistent mangling works.
 */
export function stemToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.endsWith('ses') || token.endsWith('xes') || token.endsWith('zes')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ches') || token.endsWith('shes')) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('us')) {
    return token.slice(0, -1);
  }
  return token;
}

/** Whitespace-split + stem. The input is expected to be normalized already. */
export function stemWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean).map(stemToken);
}
