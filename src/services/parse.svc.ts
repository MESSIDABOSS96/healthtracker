// src/services/parse.svc.ts
// Freeform food-description parsing. Two providers behind one interface:
//   1. AI — Claude Haiku, called browser-direct (officially supported CORS path
//      via the `anthropic-dangerous-direct-browser-access` header) with the
//      user's on-device key. Structured JSON output, Zod-validated.
//   2. Local — deterministic grammar for offline / no-key use:
//      "<name> <qty><unit> <P>p <C>c <F>f [<cal>cal] [/100g]"
//
// Results NEVER auto-save: the UI routes every parse through an editable
// confirm form (LLM unit/portion hallucination is a documented failure mode).
//
// TRANSACTION RULE: the fetch here must always complete BEFORE any Dexie
// write begins — never call parse functions inside a db.transaction.

import { z } from 'zod';
import { getApiKey } from '@/lib/apiKey';

export interface ParsedFood {
  name: string;
  /** Amount consumed, e.g. 200 + 'g', or 2 + 'count'. */
  quantity: number;
  unit: string;
  /** Nutrition for the amount consumed (not per-100g, not per-serving). */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  assumptions?: string;
  source: 'ai' | 'local';
}

export type ParseErrorKind = 'no-key' | 'offline' | 'auth' | 'api' | 'unparseable';

export class ParseError extends Error {
  readonly kind: ParseErrorKind;

  constructor(message: string, kind: ParseErrorKind) {
    super(message);
    this.name = 'ParseError';
    this.kind = kind;
  }
}

// ---------------------------------------------------------------------------
// Sanity check — flags macro math that doesn't add up (4/4/9 rule).
// Tolerance is loose on purpose: fiber/alcohol/rounding legitimately drift.
// ---------------------------------------------------------------------------

export function isMacroMathSuspicious(p: {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}): boolean {
  const derived = 4 * p.proteinG + 4 * p.carbsG + 9 * p.fatG;
  if (p.calories <= 0 && derived <= 0) return false;
  const tolerance = Math.max(40, derived * 0.3);
  return Math.abs(p.calories - derived) > tolerance;
}

// ---------------------------------------------------------------------------
// AI provider
// ---------------------------------------------------------------------------

const aiResultSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  assumptions: z.string(),
});

const OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Short food name, e.g. "Chicken breast"' },
    quantity: { type: 'number', description: 'Amount consumed' },
    unit: {
      type: 'string',
      description: 'Unit of the amount consumed: g, ml, oz, or "count" for discrete items',
    },
    calories: { type: 'number', description: 'kcal for the amount consumed' },
    proteinG: { type: 'number', description: 'Protein grams for the amount consumed' },
    carbsG: { type: 'number', description: 'Carb grams for the amount consumed' },
    fatG: { type: 'number', description: 'Fat grams for the amount consumed' },
    assumptions: {
      type: 'string',
      description: 'One short sentence on any assumption made (or empty string)',
    },
  },
  required: ['name', 'quantity', 'unit', 'calories', 'proteinG', 'carbsG', 'fatG', 'assumptions'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You convert one food description into nutrition facts for the amount actually eaten.

Rules:
- If the text gives nutrition facts (e.g. "31g protein per 100g", label values per serving), USE those numbers and scale them to the amount eaten. Show the scaling assumption.
- Watch units carefully: per-100g vs per-serving vs total, and g vs oz (1 oz = 28.35 g).
- Only if no facts are given, estimate from standard nutrition knowledge for a typical preparation, and say so in assumptions.
- calories must be consistent with the macros (protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g, small drift ok).
- One food item per request. If several foods are described, parse the dominant one and note it in assumptions.
- Numbers only in numeric fields. Round to 1 decimal.`;

async function parseWithAI(text: string, apiKey: string): Promise<ParsedFood> {
  let resp: Response;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
        output_config: {
          format: { type: 'json_schema', schema: OUTPUT_JSON_SCHEMA },
        },
      }),
    });
  } catch {
    throw new ParseError('Network error — using offline entry instead.', 'offline');
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new ParseError('API key was rejected — check it in Settings.', 'auth');
  }
  if (!resp.ok) {
    throw new ParseError(`Parse service error (${resp.status}). Try again.`, 'api');
  }

  const data = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };
  const textBlock = data.content?.find(b => b.type === 'text' && typeof b.text === 'string');
  if (data.stop_reason === 'refusal' || !textBlock?.text) {
    throw new ParseError("Couldn't parse that — try rephrasing.", 'api');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(textBlock.text);
  } catch {
    throw new ParseError("Couldn't parse that — try rephrasing.", 'api');
  }
  const parsed = aiResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ParseError("Couldn't parse that — try rephrasing.", 'api');
  }

  const r = parsed.data;
  return {
    name: r.name,
    quantity: r.quantity,
    unit: r.unit,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    assumptions: r.assumptions || undefined,
    source: 'ai',
  };
}

// ---------------------------------------------------------------------------
// Local provider — deterministic, offline.
// Grammar (order-insensitive apart from name):
//   "<name> <qty><unit> <P>p <C>c <F>f [<cal>cal|kcal] [/100g | per 100g]"
// Examples:
//   "chicken breast 200g 31p 0c 4f /100g"
//   "protein bar 1x 210cal 20p 22c 7f"
//   "rice 150g 2.7p 28c 0.3f"
// ---------------------------------------------------------------------------

const QTY_RE = /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|x|ct|count|serving|servings)\b/i;
const MACRO_RE = (letter: string) => new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${letter}\\b`, 'i');
const CAL_RE = /(\d+(?:\.\d+)?)\s*(?:cal|kcal)\b/i;
const PER100_RE = /(?:\/\s*100\s*(?:g|ml)|per\s*100\s*(?:g|ml))/i;

export function parseLocal(text: string): ParsedFood {
  const input = text.trim();
  const qtyMatch = input.match(QTY_RE);
  const pMatch = input.match(MACRO_RE('p'));
  const cMatch = input.match(MACRO_RE('c'));
  const fMatch = input.match(MACRO_RE('f'));
  const calMatch = input.match(CAL_RE);
  const per100 = PER100_RE.test(input);

  if (!qtyMatch || !pMatch || !cMatch || !fMatch) {
    throw new ParseError(
      'Offline format: "name 150g 31p 0c 4f" (add "/100g" if facts are per 100g).',
      'unparseable',
    );
  }

  let quantity = parseFloat(qtyMatch[1]);
  let unit = qtyMatch[2].toLowerCase();
  if (unit === 'kg') {
    quantity *= 1000;
    unit = 'g';
  } else if (unit === 'l') {
    quantity *= 1000;
    unit = 'ml';
  } else if (unit === 'oz') {
    quantity = Math.round(quantity * 28.35 * 10) / 10;
    unit = 'g';
  } else if (unit === 'x' || unit === 'ct' || unit === 'count') {
    unit = 'count';
  } else if (unit === 'serving' || unit === 'servings') {
    unit = 'count';
  }

  // Macros as written; scale from per-100 to the consumed amount when flagged.
  const scale = per100 && (unit === 'g' || unit === 'ml') ? quantity / 100 : 1;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const proteinG = round1(parseFloat(pMatch[1]) * scale);
  const carbsG = round1(parseFloat(cMatch[1]) * scale);
  const fatG = round1(parseFloat(fMatch[1]) * scale);
  const calories = calMatch
    ? round1(parseFloat(calMatch[1]) * scale)
    : Math.round(4 * proteinG + 4 * carbsG + 9 * fatG);

  // Name = whatever remains after stripping the recognized tokens.
  const name = input
    .replace(QTY_RE, ' ')
    .replace(MACRO_RE('p'), ' ')
    .replace(MACRO_RE('c'), ' ')
    .replace(MACRO_RE('f'), ' ')
    .replace(CAL_RE, ' ')
    .replace(PER100_RE, ' ')
    .replace(/[@,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) {
    throw new ParseError('Include a name, e.g. "chicken 150g 31p 0c 4f".', 'unparseable');
  }

  return { name, quantity, unit, calories, proteinG, carbsG, fatG, source: 'local' };
}

// ---------------------------------------------------------------------------
// Orchestrator — AI when a key exists and we're online; local otherwise.
// ---------------------------------------------------------------------------

export async function parseFood(text: string): Promise<ParsedFood> {
  const apiKey = getApiKey();
  if (apiKey && navigator.onLine) {
    try {
      return await parseWithAI(text, apiKey);
    } catch (err) {
      // Offline/network failures fall through to the local grammar; auth and
      // hard API errors surface to the user (silent fallback would mask a bad key).
      if (err instanceof ParseError && err.kind === 'offline') {
        return parseLocal(text);
      }
      throw err;
    }
  }
  return parseLocal(text);
}
