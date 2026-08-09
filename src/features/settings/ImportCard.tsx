// src/features/settings/ImportCard.tsx
// Restore from a JSON backup. Destructive (replaces all data) → explicit
// two-step confirm inline. Only current-schemaVersion files are accepted.

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importAll, ImportError, type ImportSummary } from '@/services/import.svc';
import { SettingsCard } from './SettingsCard';

type Phase = 'idle' | 'confirm' | 'importing' | 'done' | 'error';

export function ImportCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setPending(file);
    setPhase('confirm');
    setMessage('');
  };

  const runImport = async () => {
    if (!pending) return;
    setPhase('importing');
    try {
      const text = await pending.text();
      const summary: ImportSummary = await importAll(text);
      setPhase('done');
      setMessage(
        `Restored ${summary.mealEntries} meals, ${summary.foods} foods, ` +
          `${summary.dailyCheckins} check-ins, ${summary.weightEntries} weigh-ins.`,
      );
    } catch (err) {
      setPhase('error');
      setMessage(err instanceof ImportError ? err.message : 'Import failed — file unchanged? Try again.');
    } finally {
      setPending(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <SettingsCard
      title="Restore backup"
      icon={Upload}
      description="Import a VZN backup JSON. This replaces everything currently on this device."
    >
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => onPick(e.target.files?.[0])}
      />

      {phase === 'confirm' && pending ? (
        <div className="space-y-3 rounded-sm border border-warn/30 bg-warn/10 p-3">
          <p className="text-[13px] leading-relaxed text-text">
            Replace all data on this device with{' '}
            <span className="font-medium">{pending.name}</span>? This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="default" size="sm" onClick={runImport}>
              Yes, replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPending(null);
                setPhase('idle');
                if (fileRef.current) fileRef.current.value = '';
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={phase === 'importing'}
          onClick={() => fileRef.current?.click()}
        >
          {phase === 'importing' ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden /> Importing…
            </>
          ) : (
            'Choose backup file'
          )}
        </Button>
      )}

      {message && (
        <p
          className={`mt-3 text-xs leading-relaxed ${phase === 'error' ? 'text-danger' : 'text-muted'}`}
          role={phase === 'error' ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </SettingsCard>
  );
}
