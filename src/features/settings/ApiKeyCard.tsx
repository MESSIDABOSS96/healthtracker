// src/features/settings/ApiKeyCard.tsx
// Anthropic API key management. Key lives in localStorage (lib/apiKey.ts) so
// it is structurally excluded from JSON exports. Without a key the app still
// works — food entry falls back to the offline structured format.

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiKey, setApiKey, clearApiKey } from '@/lib/apiKey';

function mask(key: string): string {
  return key.length <= 12 ? '••••••••' : `${key.slice(0, 10)}…${key.slice(-4)}`;
}

export function ApiKeyCard() {
  const [stored, setStored] = useState<string | null>(() => getApiKey());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    if (!draft.trim()) return;
    setApiKey(draft);
    setStored(getApiKey());
    setDraft('');
    setEditing(false);
  };

  const remove = () => {
    clearApiKey();
    setStored(null);
    setEditing(false);
  };

  return (
    <Card className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h2 className="text-base font-semibold text-text flex items-center gap-2">
        <KeyRound size={16} className="text-muted" aria-hidden />
        AI food parsing
      </h2>

      {stored && !editing ? (
        <>
          <p className="text-sm text-muted">
            Key saved: <span className="tabular-nums">{mask(stored)}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
              Replace
            </Button>
            <Button type="button" variant="ghost" onClick={remove} style={{ color: 'var(--danger)' }}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Paste an Anthropic API key to type food in plain language and have calories + macros
            computed for you (~a tenth of a cent per new item). Stored only on this device, never
            included in backups. Without a key, the structured offline format still works.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              save();
            }}
            className="flex gap-2"
          >
            <input
              type="password"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              aria-label="Anthropic API key"
              className="flex-1 h-11 px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            />
            <Button type="submit" variant="default" disabled={!draft.trim()}>
              Save
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </form>
          <p className="text-xs text-muted">
            Get a key at console.anthropic.com → API keys ($5 minimum credit lasts years at this
            usage).
          </p>
        </>
      )}
    </Card>
  );
}
