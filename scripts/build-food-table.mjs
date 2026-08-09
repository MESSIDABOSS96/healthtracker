// scripts/build-food-table.mjs
// Generates src/data/foodTable.ts — the bundled offline nutrition table (tier 2
// of the food resolver). Run with `npm run build:food-table`.
//
// Source: USDA FoodData Central, SR Legacy release. Public domain (17 U.S.C.
// §105), so it can be redistributed inside the app with no attribution
// obligation — which is the whole point: the table has to work offline, and a
// licence that required a network callback would defeat it.
//
// The zip is ~6MB and is cached under .cache/ after the first run. It is NOT
// committed; the generated .ts file is, so a normal `npm install && npm build`
// never touches the network.
//
// Why a .ts module and not a .json asset: the service worker's precache
// globPatterns (vite.config.ts) covers js/css/html/svg/png/webp/woff2 — not
// json. Emitting a module means the table ships as a code-split JS chunk and
// gets precached for free, which is what makes tier 2 work on a plane.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache');
const ZIP_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip';
const ZIP = join(CACHE, 'sr_legacy.zip');
const DATA = join(CACHE, 'sr_legacy', 'FoodData_Central_sr_legacy_food_csv_2018-04');
const OUT = join(ROOT, 'src', 'data', 'foodTable.ts');

// ---------------------------------------------------------------------------
// CSV — USDA quotes every field and embeds commas and escaped quotes inside
// them, so a split(',') parser silently mangles the data. Small state machine.
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  return rows
    .filter(r => r.length === header.length)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

function ensureData() {
  if (existsSync(join(DATA, 'food.csv'))) return;
  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(ZIP)) {
    console.log('Downloading USDA SR Legacy (~6MB)…');
    execFileSync('curl', ['-sL', '--fail', '--max-time', '300', '-o', ZIP, ZIP_URL], {
      stdio: 'inherit',
    });
  }
  console.log('Unzipping…');
  execFileSync('unzip', ['-o', '-q', ZIP, '-d', join(CACHE, 'sr_legacy')], { stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/** Categories nobody using this app is logging. Dropping them is mostly about
 *  search quality, not bytes: "Babyfood, banana…" rows outrank "Bananas, raw"
 *  on a naive token match purely by being numerous. */
const DROP_CATEGORIES = new Set([
  'Baby Foods',
  'American Indian/Alaska Native Foods',
  'Quality Control Materials',
  'Spices and Herbs',
]);

const DROP_DESCRIPTION = [
  /^Babyfood/i,
  /\((Navajo|Alaska Native|Apache|Shoshone Bannock|Ojibwe|Hopi|Yupik)\)/i,
  /infant formula/i,
  /USDA Commodity/i,
  /\bschool lunch\b/i,
  /Quality Control/i,
];

/** Segments that qualify a USDA entry without changing what the user typed or
 *  meaningfully changing the macros. Removing them shortens display names AND
 *  collapses near-duplicate rows (the four identical "long-grain white rice"
 *  variants become one). Anything that DOES move the numbers — raw/cooked,
 *  drained, with skin, sweetened — is deliberately absent from this list. */
const NOISE_SEGMENTS = [
  'broilers or fryers',
  'all grades',
  'all classes',
  'composite of trimmed retail cuts',
  'trimmed to 0" fat',
  'trimmed to 1/8" fat',
  'trimmed to 1/4" fat',
  'select',
  'choice',
  'prime',
  'enriched',
  'unenriched',
  'unprepared',
  'commercially prepared',
  'prepared from recipe',
  'home-prepared',
  'regular and quick',
  'not fortified',
  'fortified',
  'includes usda commodity',
  'upc',
];

/** Bureaucratic parentheticals USDA appends to some names. They aren't
 *  qualifiers a user would ever type, and they wreck the display name. */
const NOISE_PARENS = /\s*\((?:includes foods for[^)]*|includes usda[^)]*)\)/gi;

function cleanName(description) {
  const segments = description
    .replace(NOISE_PARENS, '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const kept = segments.filter(s => {
    const low = s.toLowerCase();
    return !NOISE_SEGMENTS.some(n => low === n || low.startsWith(`${n} `));
  });
  return (kept.length ? kept : segments).join(', ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Portions — the gram weight of "1 <thing>", so `2 eggs` resolves without a
// scale. Only countable portions are useful here; cups and tablespoons are a
// different measuring modality and the user weighs their food anyway.
// ---------------------------------------------------------------------------

const PORTION_PRIORITY = [
  m => /^medium\b/.test(m),
  m => /^large\b/.test(m),
  m => m === 'nlea serving',
  m => /^small\b/.test(m),
];

function pickPortion(portions) {
  const countable = portions.filter(p => {
    const m = (p.modifier || '').toLowerCase();
    const g = parseFloat(p.gram_weight);
    if (!Number.isFinite(g) || g <= 0 || g > 1500) return false;
    if (!m) return false;
    // Volume and mass measures aren't "one of these". `oz` has to be anchored
    // rather than matched loosely: "oz (23 whole kernels)" is a weight, but
    // "breast, bone removed" is exactly the countable portion we want, and a
    // loose /oz/ would not distinguish them.
    if (/^\d*\s*(fl\s*)?oz\b/.test(m)) return false;
    return !/\b(cup|tbsp|tsp|tablespoon|teaspoon|quart|pint|liter|ml|gram|lb)\b/.test(m);
  });
  if (!countable.length) return null;
  for (const test of PORTION_PRIORITY) {
    const hit = countable.find(p => test((p.modifier || '').toLowerCase()));
    if (hit) {
      return { grams: Math.round(parseFloat(hit.gram_weight)), label: hit.modifier.trim() };
    }
  }
  const first = countable[0];
  return { grams: Math.round(parseFloat(first.gram_weight)), label: first.modifier.trim() };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

ensureData();

console.log('Reading CSVs…');
const foods = parseCsv(readFileSync(join(DATA, 'food.csv'), 'utf8'));
const categories = new Map(
  parseCsv(readFileSync(join(DATA, 'food_category.csv'), 'utf8')).map(c => [c.id, c.description]),
);

const NUTRIENT_IDS = { 1008: 'kcal', 1003: 'protein', 1005: 'carbs', 1004: 'fat' };
const nutrients = new Map();
for (const r of parseCsv(readFileSync(join(DATA, 'food_nutrient.csv'), 'utf8'))) {
  const key = NUTRIENT_IDS[Number(r.nutrient_id)];
  if (!key) continue;
  let entry = nutrients.get(r.fdc_id);
  if (!entry) nutrients.set(r.fdc_id, (entry = {}));
  entry[key] = parseFloat(r.amount);
}

const portionsByFood = new Map();
for (const p of parseCsv(readFileSync(join(DATA, 'food_portion.csv'), 'utf8'))) {
  let list = portionsByFood.get(p.fdc_id);
  if (!list) portionsByFood.set(p.fdc_id, (list = []));
  list.push(p);
}

console.log('Filtering…');
const candidates = [];
for (const food of foods) {
  const category = categories.get(food.food_category_id) ?? '';
  if (DROP_CATEGORIES.has(category)) continue;
  if (DROP_DESCRIPTION.some(re => re.test(food.description))) continue;
  // Beyond ~6 qualifiers a description is a lab specification, not a food
  // someone types into a tracker.
  if ((food.description.match(/,/g) || []).length > 6) continue;

  const n = nutrients.get(food.fdc_id);
  if (!n) continue;
  const { kcal, protein, carbs, fat } = n;
  if (![kcal, protein, carbs, fat].every(Number.isFinite)) continue;
  // A row with no energy and no macros carries no information.
  if (kcal <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) continue;

  const name = cleanName(food.description);
  if (!name || name.length > 90) continue;

  candidates.push({
    name,
    segments: (food.description.match(/,/g) || []).length,
    kcal,
    protein,
    carbs,
    fat,
    portion: pickPortion(portionsByFood.get(food.fdc_id) ?? []),
  });
}

// Dedupe on the cleaned name. Ties go to the entry whose ORIGINAL description
// had the fewest qualifiers — the most canonical rendering of that food.
const byName = new Map();
for (const c of candidates) {
  const key = c.name.toLowerCase();
  const existing = byName.get(key);
  if (!existing || c.segments < existing.segments) byName.set(key, c);
}

const rows = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Emit — one delimited line per food, not JSON. Keys repeated 7,000 times cost
// more than the data; a `\n`-split string is ~40% smaller before gzip and
// parses in a single pass at load.
//   name|kcal|protein|carbs|fat|portionGrams|portionLabel
// ---------------------------------------------------------------------------

const num = n => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

const lines = rows.map(r => {
  const cols = [
    r.name.replace(/[|\n]/g, ' '),
    num(r.kcal),
    num(r.protein),
    num(r.carbs),
    num(r.fat),
    r.portion ? String(r.portion.grams) : '',
    r.portion ? r.portion.label.replace(/[|\n]/g, ' ') : '',
  ];
  // Trailing empties are implied by the split — drop them.
  while (cols.length && cols[cols.length - 1] === '') cols.pop();
  return cols.join('|');
});

const payload = lines.join('\n');
const file = `// src/data/foodTable.ts
//
// GENERATED — do not edit by hand. Run \`npm run build:food-table\`.
// Source: USDA FoodData Central, SR Legacy (public domain, 17 U.S.C. §105).
//
// ${rows.length} foods, per 100g. One line per food, pipe-delimited:
//   name|kcal|protein|carbs|fat|portionGrams|portionLabel
// The last two are omitted when the food has no meaningful countable portion.
// Parsed once, lazily, by services/foodTable.svc.ts — this module is imported
// dynamically so it lands in its own chunk and never touches first paint.

export const FOOD_TABLE_ROWS = ${rows.length};

export const FOOD_TABLE = ${JSON.stringify(payload)};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, file);

const gz = gzipSync(Buffer.from(payload)).length;
console.log(`\nWrote ${OUT}`);
console.log(`  foods:      ${rows.length}`);
console.log(`  with portion: ${rows.filter(r => r.portion).length}`);
console.log(`  raw:        ${(payload.length / 1024).toFixed(1)} KB`);
console.log(`  gzipped:    ${(gz / 1024).toFixed(1)} KB`);
