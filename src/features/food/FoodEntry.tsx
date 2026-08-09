// src/features/food/FoodEntry.tsx
// Freeform food entry, resolved as you type.
//
// The composer's job is to make logging feel like arithmetic, not like a
// request. Every keystroke re-runs the deterministic tiers of the resolver
// (your library → the bundled USDA table → the 4/4/9 calculator when the text
// carries its own numbers); all three are synchronous, so the answer is already
// on screen before you reach for Enter. Nothing spins, because nothing is
// waiting on a network.
//
// The model tier is the exception and looks like one: it only runs when you ask
// for it or when nothing local matched, it shows a spinner, and its result goes
// through the editable confirm card before anything is saved (CLAUDE.md rule
// #7 — the hallucination guard applies to generated numbers, not to arithmetic
// or to a row the user already confirmed once).
//
// Deterministic logs write straight through and offer an undo instead. That
// trade is the entire point: a confirm tap on a number the app DERIVED rather
// than guessed is friction with nothing on the other side of it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Loader2, Sparkles, TriangleAlert, Undo2 } from 'lucide-react';
import type { MealBucket } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, focusRing, press } from '@/components/ui/styles';
import { inferBucket } from '@/lib/dayKey';
import { getApiKey } from '@/lib/apiKey';
import { isMacroMathSuspicious, ParseError, type ParsedFood } from '@/services/parse.svc';
import {
  resolveInstant,
  resolveWithAI,
  type ResolveTier,
  type Resolution,
} from '@/services/resolve.svc';
import { preloadFoodTable } from '@/services/foodTable.svc';
import { logParsedFood } from '@/services/food.svc';
import { logMeal, undoMealLog } from '@/services/meals.svc';
import { cn } from '@/lib/utils';

const BUCKETS: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BUCKET_OPTIONS = BUCKETS.map(b => ({ value: b, label: b }));

/** Long enough to notice and reach, short enough not to hang around. */
const UNDO_WINDOW_MS = 7000;

/** Typing is faster than Dexie round-trips; this keeps the two in step without
 *  the results visibly lagging the caret. */
const RESOLVE_DEBOUNCE_MS = 110;

const TIER_LABEL: Record<ResolveTier, string> = {
  calculator: 'Calculated',
  library: 'Your library',
  table: 'USDA',
  ai: 'AI estimate',
};

interface Draft {
  name: string;
  quantity: string;
  unit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  assumptions?: string;
  source: ParsedFood['source'];
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

function formatAmount(p: ParsedFood): string {
  const qty = Math.round(p.quantity * 10) / 10;
  return p.unit === 'count' ? `${qty}×` : `${qty} ${p.unit}`;
}

export function FoodEntry({ dayKey }: { dayKey: string }) {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState('');
  const [results, setResults] = useState<Resolution[]>([]);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bucket, setBucket] = useState<MealBucket>(() => inferBucket());
  const [error, setError] = useState<string | null>(null);
  const [lastLog, setLastLog] = useState<{ entryId: string; label: string } | null>(null);
  const hasKey = getApiKey() !== null;

  // Warm the table chunk while the user is still deciding what to type, so the
  // first search doesn't pay for the fetch.
  useEffect(preloadFoodTable, []);

  // --- live resolution ----------------------------------------------------
  // `seq` discards out-of-order responses: two keystrokes in flight can settle
  // backwards, and rendering the older one puts stale numbers under the caret.
  const seq = useRef(0);
  useEffect(() => {
    const query = text.trim();
    if (!query) {
      setResults([]);
      return;
    }
    const ticket = ++seq.current;
    const timer = setTimeout(() => {
      resolveInstant(query)
        .then(found => {
          if (seq.current === ticket) setResults(found);
        })
        .catch(err => {
          // This runs on every keystroke, so it can't raise a visible error —
          // the composer just falls back to offering the AI tier. Anything that
          // breaks here is a Dexie or chunk-load fault worth seeing in a log.
          console.error('[FoodEntry] resolve failed', err);
          if (seq.current === ticket) setResults([]);
        });
    }, RESOLVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!lastLog) return;
    const timer = setTimeout(() => setLastLog(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [lastLog]);

  const reset = () => {
    setText('');
    setResults([]);
    setError(null);
    seq.current++;
  };

  // --- logging ------------------------------------------------------------

  const logResolution = async (resolution: Resolution) => {
    setError(null);
    const entryId = resolution.libraryFood
      ? // Straight from a library row: log the row as-is. Routing this through
        // logParsedFood would re-derive per-serving facts from numbers that
        // were themselves derived from it, and rewrite the row each time.
        await logMeal({
          food: resolution.libraryFood,
          servings: resolution.libraryServings ?? 1,
          bucket: inferBucket(),
          dayKey,
        })
      : (await logParsedFood({ parsed: resolution.parsed, bucket: inferBucket(), dayKey }))
          .entryId;

    setLastLog({
      entryId,
      label: `${resolution.parsed.name} · ${Math.round(resolution.parsed.calories)} kcal`,
    });
    reset();
  };

  const askAI = useCallback(async () => {
    const query = text.trim();
    if (!query || asking) return;
    setError(null);
    setAsking(true);
    try {
      const resolution = await resolveWithAI(query);
      setDraft(toDraft(resolution.parsed));
      setBucket(inferBucket());
    } catch (err) {
      setError(err instanceof ParseError ? err.message : 'Something went wrong — try again.');
    } finally {
      setAsking(false);
    }
  }, [text, asking]);

  const handleSubmit = () => {
    if (!text.trim() || asking) return;
    if (results.length) void logResolution(results[0]);
    else void askAI();
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    const parsed = fromDraft(draft);
    if (!parsed.name) return;
    const { entryId } = await logParsedFood({ parsed, bucket, dayKey });
    setLastLog({ entryId, label: `${parsed.name} · ${Math.round(parsed.calories)} kcal` });
    setDraft(null);
    reset();
  };

  const handleUndo = async () => {
    if (!lastLog) return;
    await undoMealLog(lastLog.entryId);
    setLastLog(null);
  };

  // --- confirm card (AI results only) -------------------------------------

  const suspicious = draft ? isMacroMathSuspicious(fromDraft(draft)) : false;

  if (draft) {
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
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-wash px-2 py-1 text-[11px] font-medium text-accent">
            <Sparkles size={11} aria-hidden /> AI parsed
          </span>
        </div>

        {draft.assumptions && (
          <p className="text-xs leading-relaxed text-muted">{draft.assumptions}</p>
        )}

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
          <Button type="button" variant="ghost" className="flex-1" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="flex-1"
            onClick={handleSaveDraft}
            disabled={!draft.name.trim()}
          >
            Log it
          </Button>
        </div>
      </motion.div>
    );
  }

  // --- composer -----------------------------------------------------------

  const query = text.trim();
  const showNoMatch = query.length > 0 && results.length === 0 && !asking;

  return (
    <div className="space-y-2">
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
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
          placeholder="What did you eat?"
          aria-label="Describe what you ate"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!query || asking}
          aria-label={results.length ? 'Log it' : 'Estimate with AI'}
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
          {asking ? (
            <Loader2 size={17} className="animate-spin" aria-hidden />
          ) : (
            <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
          )}
        </button>
      </form>

      {results.length > 0 && (
        <motion.ul
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-card divide-y divide-hairline"
        >
          {results.map((r, i) => (
            <li key={`${r.tier}-${r.parsed.name}-${i}`}>
              <button
                type="button"
                onClick={() => void logResolution(r)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left',
                  '[@media(hover:hover)]:hover:bg-surface-2',
                  press,
                  'transition-[background-color,transform] duration-150 ease-out-soft',
                  focusRing,
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-text">
                    {r.parsed.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">
                    <span className="stat">{formatAmount(r.parsed)}</span>
                    {' · '}
                    <span className="stat">{Math.round(r.parsed.proteinG)}</span>P{' '}
                    <span className="stat">{Math.round(r.parsed.carbsG)}</span>C{' '}
                    <span className="stat">{Math.round(r.parsed.fatG)}</span>F
                    {' · '}
                    {TIER_LABEL[r.tier]}
                  </span>
                </span>
                <span className="stat shrink-0 text-[15px] font-semibold text-text">
                  {Math.round(r.parsed.calories)}
                </span>
              </button>
            </li>
          ))}
        </motion.ul>
      )}

      {showNoMatch && (
        <div className="rounded-lg border border-hairline bg-surface px-4 py-3 shadow-card">
          {hasKey ? (
            <button
              type="button"
              onClick={() => void askAI()}
              className={cn(
                '-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-sm px-1 py-0.5 text-left',
                focusRing,
              )}
            >
              <Sparkles size={13} className="shrink-0 text-accent" aria-hidden />
              <span className="text-[13px] text-muted">
                No match — <span className="font-medium text-text">estimate with AI</span>
              </span>
            </button>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">
              No match. Add the facts to log it now —{' '}
              <span className="stat text-text">250g 30p 10c 5f</span> — or add an API key in
              Settings to estimate unknown foods.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="px-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {lastLog && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 rounded-full border border-hairline bg-surface-2 py-2 pl-4 pr-2"
          role="status"
        >
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
            Logged {lastLog.label}
          </span>
          <button
            type="button"
            onClick={() => void handleUndo()}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1',
              'text-[13px] font-medium text-accent',
              '[@media(hover:hover)]:hover:bg-accent-wash',
              press,
              'transition-[background-color,transform] duration-150 ease-out-soft',
              focusRing,
            )}
          >
            <Undo2 size={13} aria-hidden /> Undo
          </button>
        </motion.div>
      )}
    </div>
  );
}
