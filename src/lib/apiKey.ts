// src/lib/apiKey.ts
// On-device AI provider config. localStorage, NOT Dexie — keeps the key
// structurally out of JSON exports (export.svc reads Dexie tables only).
//
// Two providers are supported. Both are called browser-direct with the user's
// own key, so there is still no backend:
//   - anthropic:  api.anthropic.com, via the officially supported CORS opt-in
//   - openrouter: openrouter.ai, OpenAI-compatible, any model in its catalog
//
// The model is stored as free text rather than a fixed list on purpose:
// OpenRouter's catalog changes constantly, and a hardcoded dropdown would rot.

import { API_KEY_KEY, AI_MODEL_KEY, AI_PROVIDER_KEY } from './storageKeys';

export type AiProvider = 'anthropic' | 'openrouter';

export const DEFAULT_MODEL: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5',
  // Chosen for LATENCY first. This parse blocks a text field the user is
  // staring at, so a model that thinks before answering is the wrong tool no
  // matter how cheap it is — the gpt-oss models were a bad default for exactly
  // that reason. This one is a mixture-of-experts: ~30B of world knowledge for
  // food recall, but only ~3B parameters active per token, so it answers at
  // small-model speed. Editable in Settings; the catalog moves.
  openrouter: 'qwen/qwen3-30b-a3b-instruct-2507',
};

/** Verified against openrouter.ai/models: all three support structured outputs
 *  and — critically — none of them is a reasoning model. Price is not the
 *  ranking axis; a parse costs a rounding error on any of them, so they're
 *  ordered by how fast they answer while still knowing what a banana is.
 *  Offered as one-tap suggestions, not a closed list — the field stays free text. */
export const OPENROUTER_SUGGESTIONS = [
  'qwen/qwen3-30b-a3b-instruct-2507',
  'openai/gpt-4.1-nano',
  'meta-llama/llama-3.3-70b-instruct',
] as const;

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
};

export function getProvider(): AiProvider {
  return localStorage.getItem(AI_PROVIDER_KEY) === 'openrouter' ? 'openrouter' : 'anthropic';
}

export function getApiKey(): string | null {
  const key = localStorage.getItem(API_KEY_KEY);
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function getModel(): string {
  const stored = localStorage.getItem(AI_MODEL_KEY)?.trim();
  return stored && stored.length > 0 ? stored : DEFAULT_MODEL[getProvider()];
}

/** Save the whole provider config together — they're only ever valid as a set. */
export function setAiConfig(config: {
  provider: AiProvider;
  key: string;
  model?: string;
}): void {
  const trimmedKey = config.key.trim();
  if (!trimmedKey) {
    clearApiKey();
    return;
  }
  localStorage.setItem(AI_PROVIDER_KEY, config.provider);
  localStorage.setItem(API_KEY_KEY, trimmedKey);

  const model = config.model?.trim();
  if (model) localStorage.setItem(AI_MODEL_KEY, model);
  else localStorage.removeItem(AI_MODEL_KEY);
}

/** @deprecated use setAiConfig — kept so a bare key set still works. */
export function setApiKey(key: string): void {
  setAiConfig({ provider: getProvider(), key, model: localStorage.getItem(AI_MODEL_KEY) ?? undefined });
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_KEY);
  localStorage.removeItem(AI_PROVIDER_KEY);
  localStorage.removeItem(AI_MODEL_KEY);
}
