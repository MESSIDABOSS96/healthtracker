// src/features/settings/ApiKeyCard.tsx
// AI provider config. The key lives in localStorage (lib/apiKey.ts) so it is
// structurally excluded from JSON exports. Without a key the app still works —
// food entry falls back to the offline structured format.

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, focusRing, label as labelClass, press } from '@/components/ui/styles';
import {
  clearApiKey,
  DEFAULT_MODEL,
  getApiKey,
  getModel,
  getProvider,
  OPENROUTER_SUGGESTIONS,
  PROVIDER_LABEL,
  setAiConfig,
  type AiProvider,
} from '@/lib/apiKey';
import { SettingsCard } from './SettingsCard';

const PROVIDER_OPTIONS = [
  { value: 'anthropic', label: PROVIDER_LABEL.anthropic },
  { value: 'openrouter', label: PROVIDER_LABEL.openrouter },
] as const satisfies ReadonlyArray<{ value: AiProvider; label: string }>;

const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  anthropic: 'sk-ant-…',
  openrouter: 'sk-or-…',
};

const PROVIDER_HELP: Record<AiProvider, string> = {
  anthropic: 'Get a key at console.anthropic.com → API keys.',
  openrouter:
    'Get a key at openrouter.ai/keys, then use any model ID from openrouter.ai/models. Cheap open-weight models handle this fine — every result goes through the confirm form before it saves.',
};

function mask(key: string): string {
  return key.length <= 12 ? '••••••••' : `${key.slice(0, 10)}…${key.slice(-4)}`;
}

export function ApiKeyCard() {
  const [stored, setStored] = useState<string | null>(() => getApiKey());
  const [storedProvider, setStoredProvider] = useState<AiProvider>(() => getProvider());
  const [storedModel, setStoredModel] = useState<string>(() => getModel());

  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState<AiProvider>(() => getProvider());
  const [draftKey, setDraftKey] = useState('');
  const [draftModel, setDraftModel] = useState('');

  // Changing only the model shouldn't cost you the key. The stored one is kept
  // unless a new one is typed — except when the provider changed, where the old
  // key is not merely stale but wrong: an Anthropic key is not an OpenRouter
  // key, and silently carrying it over would fail as a confusing 401 later.
  const providerChanged = provider !== storedProvider;
  const canKeepKey = !!stored && editing && !providerChanged;
  const effectiveKey = draftKey.trim() || (canKeepKey ? (stored as string) : '');

  const save = () => {
    if (!effectiveKey) return;
    setAiConfig({ provider, key: effectiveKey, model: draftModel || DEFAULT_MODEL[provider] });
    setStored(getApiKey());
    setStoredProvider(getProvider());
    setStoredModel(getModel());
    setDraftKey('');
    setDraftModel('');
    setEditing(false);
  };

  const remove = () => {
    clearApiKey();
    setStored(null);
    setEditing(false);
  };

  const startEditing = () => {
    setProvider(storedProvider);
    setDraftModel(storedModel);
    setEditing(true);
  };

  /** Switching provider always swaps in that provider's default model. The
   *  previous attempt kept a custom model ID across the switch, which could
   *  leave an Anthropic model selected under OpenRouter — a 404 waiting to
   *  happen. Model IDs don't transfer between providers, so neither should this. */
  const chooseProvider = (next: AiProvider) => {
    setProvider(next);
    setDraftModel(DEFAULT_MODEL[next]);
  };

  const saved = stored && !editing;

  return (
    <SettingsCard
      title="AI fallback"
      icon={KeyRound}
      // Deliberately modest copy. Most entries never reach this — they're
      // answered offline by your own library, the bundled food table, or the
      // facts you typed. Promising "freeform entry" here would credit the key
      // with the fast path it isn't on.
      description={
        saved
          ? 'On. Used only for foods the offline table doesn’t know — restaurant dishes and the like.'
          : 'Optional. Typing food already works offline: your own library, a bundled table of ~6,000 foods, and any nutrition facts you type. A key adds estimates for the leftovers, like a specific restaurant dish. Stored only on this device, never included in backups.'
      }
    >
      {saved ? (
        <div className="space-y-3">
          <dl className="space-y-1.5 rounded-sm bg-surface-2 px-3 py-2.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Provider</dt>
              <dd className="font-medium text-text">{PROVIDER_LABEL[storedProvider]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted">Model</dt>
              <dd className="stat truncate text-text">{storedModel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Key</dt>
              <dd className="stat text-text">{mask(stored)}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={startEditing}>
              Change
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={remove}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <Segmented
            value={provider}
            onChange={chooseProvider}
            options={PROVIDER_OPTIONS}
            ariaLabel="AI provider"
          />

          <div className="space-y-1.5">
            <label htmlFor="ai-key" className={`block ${labelClass}`}>
              API key{canKeepKey && <span className="font-normal text-faint"> · optional</span>}
            </label>
            <input
              id="ai-key"
              type="password"
              value={draftKey}
              onChange={e => setDraftKey(e.target.value)}
              placeholder={canKeepKey ? `Keeping ${mask(stored as string)}` : KEY_PLACEHOLDER[provider]}
              autoComplete="off"
              className={field}
            />
            {canKeepKey && (
              <p className="text-[11.5px] text-faint">
                Leave blank to keep your current key.
              </p>
            )}
            {editing && providerChanged && (
              <p className="text-[11.5px] text-warn">
                Switching provider needs a {PROVIDER_LABEL[provider]} key — the old one won&apos;t work.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-model" className={`block ${labelClass}`}>
              Model
            </label>
            <input
              id="ai-model"
              type="text"
              value={draftModel}
              onChange={e => setDraftModel(e.target.value)}
              placeholder={DEFAULT_MODEL[provider]}
              autoComplete="off"
              spellCheck={false}
              className={`${field} stat text-[13px]`}
            />
          </div>

          {provider === 'openrouter' && (
            <div className="flex flex-wrap gap-1.5">
              {OPENROUTER_SUGGESTIONS.map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraftModel(id)}
                  className={`stat rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-150 ease-out-soft ${press} ${focusRing} ${
                    draftModel === id
                      ? 'border-transparent bg-accent-wash text-accent'
                      : 'border-hairline bg-surface-2 text-muted'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs leading-relaxed text-faint">{PROVIDER_HELP[provider]}</p>

          <div className="flex gap-2">
            <Button type="submit" variant="default" className="flex-1" disabled={!effectiveKey}>
              Save
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </SettingsCard>
  );
}
