// src/features/food/FoodEntry.tsx
// Freeform food entry: type it → parse (AI when key+online, local grammar
// otherwise) → editable confirm card → save. NOTHING saves without the
// explicit confirm tap (LLM macro hallucination guard), and suspicious macro
// math (4/4/9 drift) gets a visible warning, never a silent save.

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import type { MealBucket } from '@/db/schema';
import { Button } from '@/components/ui/button';
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
    const field = (
      label: string,
      key: keyof Draft,
      opts: { text?: boolean; span?: string } = {},
    ) => (
      <label className={cn('block', opts.span)}>
        <span className="block text-xs text-muted mb-1">{label}</span>
        <input
          type={opts.text ? 'text' : 'number'}
          inputMode={opts.text ? 'text' : 'decimal'}
          step="0.1"
          value={(draft[key] as string) ?? ''}
          onChange={e => setDraft({ ...draft, [key]: e.target.value })}
          className="w-full h-11 px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
      </label>
    );

    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Check before saving</p>
          {draft.source === 'ai' && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Sparkles size={12} aria-hidden /> AI parsed
            </span>
          )}
        </div>

        {draft.assumptions && (
          <p className="text-xs text-muted italic">{draft.assumptions}</p>
        )}
        {suspicious && (
          <p className="flex items-start gap-1.5 text-xs text-amber-400" role="alert">
            <TriangleAlert size={14} className="shrink-0 mt-px" aria-hidden />
            Calories don&apos;t match the macros — double-check these numbers.
          </p>
        )}

        <div className="grid grid-cols-6 gap-2">
          {field('Name', 'name', { text: true, span: 'col-span-4' })}
          {field('Amount', 'quantity')}
          {field('Unit', 'unit', { text: true })}
          {field('Calories', 'calories', { span: 'col-span-3' })}
          {field('Protein', 'proteinG')}
          {field('Carbs', 'carbsG')}
          {field('Fat', 'fatG')}
        </div>

        <div role="radiogroup" aria-label="Meal" className="flex gap-2">
          {BUCKETS.map(b => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={bucket === b}
              onClick={() => setBucket(b)}
              className={cn(
                'h-10 flex-1 rounded-md border text-xs capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                bucket === b
                  ? 'bg-bg border-accent text-accent'
                  : 'bg-bg border-border text-text hover:bg-border/40',
              )}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={handleSave} disabled={!draft.name.trim()}>
            Log it
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={e => {
          e.preventDefault();
          handleParse();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={hasKey ? '200g chicken, 31g protein per 100g…' : 'chicken 200g 31p 0c 4f /100g'}
          aria-label="Describe what you ate"
          className="flex-1 h-11 px-3 rounded-md bg-bg border border-border text-text placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
        <Button type="submit" variant="default" disabled={!text.trim() || phase === 'parsing'}>
          {phase === 'parsing' ? (
            <Loader2 size={16} className="animate-spin" aria-label="Parsing" />
          ) : (
            'Add'
          )}
        </Button>
      </form>
      {error && (
        <p className="text-xs text-amber-400" role="alert">
          {error}
        </p>
      )}
      {!hasKey && (
        <p className="text-xs text-muted">
          Offline format: <span className="tabular-nums">name 150g 31p 0c 4f</span> (add /100g if
          facts are per 100g). Add an API key in Settings for freeform entry.
        </p>
      )}
    </div>
  );
}
