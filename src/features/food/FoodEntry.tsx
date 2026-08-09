// src/features/food/FoodEntry.tsx
// Freeform food entry: type it → parse (AI when key+online, local grammar
// otherwise) → editable confirm card → save. NOTHING saves without the
// explicit confirm tap (LLM macro hallucination guard), and suspicious macro
// math (4/4/9 drift) gets a visible warning, never a silent save.
//
// The idle state is deliberately shaped like a message composer — one field, a
// round send button — because that's the promise of the feature: say what you
// ate in your own words and it's handled. The confirm state replaces it in
// place so the flow reads as one object changing, not two screens.

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import type { MealBucket } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, focusRing, press } from '@/components/ui/styles';
import { inferBucket } from '@/lib/dayKey';
import { getApiKey } from '@/lib/apiKey';
import {
  parseFood,
  isMacroMathSuspicious,
  ParseError,
  type ParsedFood,
} from '@/services/parse.svc';
import { logParsedFood } from '@/services/food.svc';
import { cn } from '@/lib/utils';

const BUCKETS: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface Draft {
  name: string;
  quantity: string;
  unit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  assumptions?: string;
  source: 'ai' | 'local';
}

function toDraft(p: ParsedFood): Draft {
  return {
    name: p.name,
    quantity: String(p.quantity),
    unit: p.unit,
    calories: String(p.calories),
    proteinG: String(p.proteinG),
    carbsG: String(p.carbsG),
    fatG: String(p.fatG),
    assumptions: p.assumptions,
    source: p.source,
  };
}

function fromDraft(d: Draft): ParsedFood {
  const num = (s: string) => Math.max(0, parseFloat(s) || 0);
  return {
    name: d.name.trim(),
    quantity: num(d.quantity) || 1,
    unit: d.unit.trim() || 'count',
    calories: num(d.calories),
    proteinG: num(d.proteinG),
    carbsG: num(d.carbsG),
    fatG: num(d.fatG),
    assumptions: d.assumptions,
    source: d.source,
  };
}

const BUCKET_OPTIONS = BUCKETS.map(b => ({ value: b, label: b }));

export function FoodEntry({ dayKey }: { dayKey: string }) {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'parsing' | 'confirm'>('idle');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bucket, setBucket] = useState<MealBucket>(() => inferBucket());
  const [error, setError] = useState<string | null>(null);
  const hasKey = getApiKey() !== null;

  const handleParse = async () => {
    if (!text.trim() || phase === 'parsing') return;
    setError(null);
    setPhase('parsing');
    try {
      const parsed = await parseFood(text.trim());
      setDraft(toDraft(parsed));
      setBucket(inferBucket());
      setPhase('confirm');
    } catch (err) {
      setError(err instanceof ParseError ? err.message : 'Something went wrong — try again.');
      setPhase('idle');
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    const parsed = fromDraft(draft);
    if (!parsed.name) return;
    await logParsedFood({ parsed, bucket, dayKey });
    setDraft(null);
    setText('');
    setPhase('idle');
  };

  const handleCancel = () => {
    setDraft(null);
    setPhase('idle');
  };

  const suspicious = draft ? isMacroMathSuspicious(fromDraft(draft)) : false;

  if (phase === 'confirm' && draft) {
    const numField = (
      labelText: string,
      key: keyof Draft,
      opts: { text?: boolean; span?: string } = {},
    ) => (
      <label className={cn('block', opts.span)}>
        <span className="mb-1.5 block text-xs font-medium text-muted">{labelText}</span>
        <input
          type={opts.text ? 'text' : 'number'}
          inputMode={opts.text ? 'text' : 'decimal'}
          step="0.1"
          value={(draft[key] as string) ?? ''}
          onChange={e => setDraft({ ...draft, [key]: e.target.value })}
          className={cn(field, !opts.text && 'stat')}
        />
      </label>
    );

    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="rounded-lg border border-hairline bg-surface shadow-raised p-4 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[15px] font-semibold tracking-[-0.015em] text-text">
            Check before saving
          </p>
          {draft.source === 'ai' && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-wash px-2 py-1 text-[11px] font-medium text-accent">
              <Sparkles size={11} aria-hidden /> AI parsed
            </span>
          )}
        </div>

        {draft.assumptions && <p className="text-xs leading-relaxed text-muted">{draft.assumptions}</p>}

        {suspicious && (
          <p
            className="flex items-start gap-2 rounded-sm border border-warn/30 bg-warn/10 px-3 py-2 text-xs leading-relaxed text-warn"
            role="alert"
          >
            <TriangleAlert size={14} className="mt-px shrink-0" aria-hidden />
            Calories don&apos;t match the macros — double-check these numbers.
          </p>
        )}

        {/* Six columns: name and calories take the full row, amount/unit split
            it, and the three macros sit in equal thirds. The old 4/1/1 top row
            left "Unit" about 50px wide — too narrow to read "serving" in. */}
        <div className="grid grid-cols-6 gap-2.5">
          {numField('Name', 'name', { text: true, span: 'col-span-6' })}
          {numField('Amount', 'quantity', { span: 'col-span-3' })}
          {numField('Unit', 'unit', { text: true, span: 'col-span-3' })}
          {numField('Calories', 'calories', { span: 'col-span-6' })}
          {numField('Protein', 'proteinG', { span: 'col-span-2' })}
          {numField('Carbs', 'carbsG', { span: 'col-span-2' })}
          {numField('Fat', 'fatG', { span: 'col-span-2' })}
        </div>

        <Segmented
          value={bucket}
          onChange={setBucket}
          options={BUCKET_OPTIONS}
          ariaLabel="Meal"
          itemClassName="capitalize"
        />

        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="flex-1"
            onClick={handleSave}
            disabled={!draft.name.trim()}
          >
            Log it
          </Button>
        </div>
      </motion.div>
    );
  }

  const canSubmit = !!text.trim() && phase !== 'parsing';

  return (
    <div className="space-y-2">
      <form
        onSubmit={e => {
          e.preventDefault();
          handleParse();
        }}
        className={cn(
          'flex items-center gap-2 rounded-full border border-hairline bg-surface p-1.5 pl-5 shadow-card',
          'transition-shadow duration-200 ease-out-soft focus-within:shadow-raised',
        )}
      >
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={hasKey ? 'What did you eat?' : 'chicken 200g 31p 0c 4f'}
          aria-label="Describe what you ate"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Parse and add"
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full',
            'bg-accent-solid text-on-accent',
            'disabled:opacity-30',
            press,
            // after `press` — see the note in button.tsx on transition merging
            'transition-[opacity,transform] duration-150 ease-out-soft',
            focusRing,
          )}
        >
          {phase === 'parsing' ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
          )}
        </button>
      </form>

      {error && (
        <p className="px-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {!hasKey && (
        <p className="px-1 text-xs leading-relaxed text-faint">
          Offline format: <span className="stat text-muted">name 150g 31p 0c 4f</span> — add{' '}
          <span className="stat text-muted">/100g</span> if the facts are per 100g. Add an API key
          in Settings for freeform entry.
        </p>
      )}
    </div>
  );
}
