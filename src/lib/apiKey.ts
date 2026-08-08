// src/lib/apiKey.ts
// On-device Anthropic API key storage. localStorage, NOT Dexie — keeps the key
// structurally out of JSON exports (export.svc reads Dexie tables only).
import { API_KEY_KEY } from './storageKeys';

export function getApiKey(): string | null {
  const key = localStorage.getItem(API_KEY_KEY);
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function setApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(API_KEY_KEY, trimmed);
  else localStorage.removeItem(API_KEY_KEY);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_KEY);
}
