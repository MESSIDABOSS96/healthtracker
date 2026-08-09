// src/services/parse.svc.ts
// The MODEL tier of the food resolver — the last resort, not the front door.
// services/resolve.svc.ts calls this only when the typed text carried no
// numbers, matched nothing in the user's library, and matched nothing in the
// bundled USDA table. In practice that leaves composite restaurant dishes.
//
// Two providers behind one interface:
//   1. Anthropic — Claude, called browser-direct (officially supported CORS
//      path via the `anthropic-dangerous-direct-browser-access` header) with
//      the user's on-device key. Structured JSON output, Zod-validated.
//   2. OpenRouter — the same job through an OpenAI-compatible endpoint, so any
//      model in its catalog (including cheap open-weight ones) can be used.
//
// They differ in every layer of the request — URL, auth header, where the
// system prompt goes, how structured output is requested, and where the reply
// text sits in the response — so they get separate functions rather than a
// config object with holes in it. What they share is the contract: return a
// ParsedFood, or throw a ParseError.
//
// AI results NEVER auto-save: the UI routes them through an editable confirm
// form (LLM unit/portion hallucination is a documented failure mode). The
// deterministic tiers are exempt — see CLAUDE.md rule #7.
//
// TRANSACTION RULE: the fetch here must always complete BEFORE any Dexie
// write begins — never call parse functions inside a db.transaction.

import { z } from 'zod';
import { getApiKey, getModel, getProvider } from '@/lib/apiKey';

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
  source: 'ai' | 'local' | 'table';
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
    // Last in the property order on purpose: with ordered structured output
    // the numbers are generated first, so a verbose assumption can't delay
    // them. Capped hard because this field used to produce a two-line
    // paragraph on every single parse that nobody reads.
    assumptions: {
      type: 'string',
      description: 'Any assumption made, 12 words maximum. Empty string if none.',
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
- Numbers only in numeric fields. Round to 1 decimal.
- Answer immediately. Do not deliberate — this blocks a text field the user is watching.`;

async function parseWithAI(text: string, apiKey: string, model: string): Promise<ParsedFood> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        // The answer object is ~90 tokens. 1024 bought nothing but a longer
        // worst case; 300 is headroom without room to ramble.
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
        output_config: {
          format: { type: 'json_schema', schema: OUTPUT_JSON_SCHEMA },
        },
      }),
    });
  } catch {
    if (controller.signal.aborted) {
      throw new ParseError('That request took too long — try again.', 'api');
    }
    throw new ParseError('Network error — using offline entry instead.', 'offline');
  } finally {
    clearTimeout(timer);
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
// OpenRouter provider — OpenAI-compatible chat completions.
// ---------------------------------------------------------------------------

/**
 * Pull a JSON object out of a model reply.
 *
 * Strong models honour `response_format` and return bare JSON. Cheap
 * open-weight ones frequently wrap it in ```json fences or add a sentence of
 * commentary, which is a formatting failure, not a wrong answer — so the
 * object is salvaged rather than thrown away. Whatever comes out still has to
 * clear Zod and the 4/4/9 sanity check before the user ever sees it.
 */
function extractJsonObject(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(text);
  } catch {
    // Fall through to brace-scanning.
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new ParseError("Couldn't parse that — try rephrasing.", 'api');
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new ParseError("Couldn't parse that — try rephrasing.", 'api');
  }
}

// Weaker models need the output contract restated in the prompt; strong ones
// ignore the repetition harmlessly.
const OPENROUTER_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

Reply with ONLY a JSON object matching this shape, and nothing else — no prose, no code fences:
{"name":string,"quantity":number,"unit":string,"calories":number,"proteinG":number,"carbsG":number,"fatG":number,"assumptions":string}`;

/** No parse should ever outlive a user's patience, and none of these calls has
 *  a natural end — a hung request left the composer spinning with no way out. */
const REQUEST_TIMEOUT_MS = 20_000;

async function callOpenRouter(
  apiKey: string,
  model: string,
  text: string,
  structured: boolean,
  signal: AbortSignal,
): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      // OpenRouter named these itself precisely so browser clients can set
      // them — `Referer` proper is a forbidden header name in fetch.
      'HTTP-Referer': window.location.origin,
      'X-Title': 'VZN',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      // See the Anthropic call: the object is ~90 tokens, so this is headroom,
      // not a budget. Unused headroom is free; unused LATENCY is not, which is
      // why this isn't set to something arbitrarily large.
      max_tokens: 300,
      messages: [
        { role: 'system', content: OPENROUTER_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      // Reasoning off. A chain of thought is the wrong trade for one line of
      // nutrition lookup: it multiplies latency and can eat the entire token
      // budget before the model gets around to answering. Ignored by models
      // that don't reason, so it is safe to always send.
      reasoning: { enabled: false },
      ...(structured
        ? {
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'nutrition', strict: true, schema: OUTPUT_JSON_SCHEMA },
            },
          }
        : {}),
      // NB: no `provider: { require_parameters: true }`. It sounds safer, but
      // it turns "this provider ignores response_format" into a hard routing
      // failure. Letting the param be ignored is strictly better here, because
      // extractJsonObject + Zod already catch a free-text reply.
    }),
  });
}

async function parseWithOpenRouter(
  text: string,
  apiKey: string,
  model: string,
): Promise<ParsedFood> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await callOpenRouter(apiKey, model, text, true, controller.signal);

    // Some models don't implement json_schema at all. That's a capability
    // mismatch, not a user error — retry in plain mode, where the prompt still
    // specifies the shape and extractJsonObject + Zod do the enforcing.
    if (!resp.ok && resp.status >= 400 && resp.status < 500 && resp.status !== 401 && resp.status !== 403) {
      resp = await callOpenRouter(apiKey, model, text, false, controller.signal);
    }
  } catch {
    // A timeout is NOT an offline condition: falling back to the local grammar
    // would answer "banana" with the offline-format instructions, which reads
    // as though the input were malformed rather than the model being slow.
    if (controller.signal.aborted) {
      throw new ParseError('That model took too long — try a faster one in Settings.', 'api');
    }
    throw new ParseError('Network error — using offline entry instead.', 'offline');
  } finally {
    clearTimeout(timer);
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new ParseError('API key was rejected — check it in Settings.', 'auth');
  }
  if (resp.status === 402) {
    throw new ParseError('OpenRouter says this key is out of credit.', 'auth');
  }
  if (resp.status === 404) {
    throw new ParseError(`No such model: "${model}". Check the model ID in Settings.`, 'api');
  }
  if (!resp.ok) {
    throw new ParseError(`Parse service error (${resp.status}). Try again.`, 'api');
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new ParseError(`Model error: ${data.error.message}`, 'api');
  }
  if (data.choices?.[0]?.finish_reason === 'length') {
    throw new ParseError(
      'That model ran out of room before answering — try a faster one in Settings.',
      'api',
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new ParseError("Couldn't parse that — try rephrasing.", 'api');
  }

  const parsed = aiResultSchema.safeParse(extractJsonObject(content));
  if (!parsed.success) {
    throw new ParseError(
      "That model didn't return usable numbers. Try a stronger model in Settings.",
      'api',
    );
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
// Orchestrator
//
// There is no local fallback here anymore. There used to be a second regex
// grammar in this file for offline use, which meant the app parsed the same
// input two different ways depending on network state. That job now belongs to
// lib/foodQuery.ts + the calculator and table tiers in resolve.svc.ts, which
// run FIRST and work offline by construction — so by the time execution
// reaches this function, the deterministic tiers have already declined.
// Falling back to a grammar here could only repeat an answer that was just
// rejected.
// ---------------------------------------------------------------------------

export async function parseFood(text: string): Promise<ParsedFood> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new ParseError(
      'No match found. Add an API key in Settings to estimate unknown foods.',
      'no-key',
    );
  }
  if (!navigator.onLine) {
    throw new ParseError(
      "You're offline — type the amount and nutrition facts to log this now.",
      'offline',
    );
  }
  return getProvider() === 'openrouter'
    ? parseWithOpenRouter(text, apiKey, getModel())
    : parseWithAI(text, apiKey, getModel());
}
