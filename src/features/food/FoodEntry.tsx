// src/features/food/FoodEntry.tsx
// Food entry.
//
// The whole system is one sentence: THE APP EITHER KNOWS A FOOD, OR IT ASKS YOU
// ONCE. Logging is a single line forever after — a name and how much — because
// every scenario reduces to the same shape:
//
//   chipotle bowl          a meal, one serving = the whole thing
//   welchs 2               a snack, one serving = one packet
//   chicken breast 1.5     a food measured per serving
//   chicken breast 150g    …the same food, said by weight; it divides for you
//
// The first time a name appears the app has nothing to log, so the label card
// opens underneath and fills itself in from whatever the text already carried.
// You finish it, and that name never asks again.
//
// What this replaced, and why: entry used to run a four-tier resolver (your
// library → a bundled USDA table → a language model) whose answer went straight
// into the log. The tiers were fast, but the composer showed only the ANSWER
// and never what it had READ, so a misparse and a correct parse looked
// identical. Typing "chipotle chicken 540 96p" logged 384 kcal — the 540 fell
// into the name, and calories were re-derived from protein — with nothing on
// screen to say so. Now the parse is a typing shortcut into fields you can see,
// and nothing is ever logged that wasn't visible first.

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Pencil, TriangleAlert, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, focusRing, press } from '@/components/ui/styles';
import { parseMacroField, scaleMacros, showMacro, type Macros } from '@/lib/macros';
import { draftFromInput, resolveEntry, type LabelDraft, type Match, type Resolution } from '@/services/resolve.svc';
import { saveLabelAndLog } from '@/services/food.svc';
import { logMeal, undoMealLog } from '@/services/meals.svc';
import { cn } from '@/lib/utils';

const UNIT_OPTIONS = [
  { value: 'count', label: 'each' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
];

/** Long enough to notice and reach, short enough not to hang around. */
const UNDO_WINDOW_MS = 7000;

/** Typing is faster than Dexie round-trips; this keeps the two in step without
 *  the results visibly lagging the caret. */
const RESOLVE_DEBOUNCE_MS = 110;

function servingLabelFrom(qty: number, unit: string, noun?: string): string {
  if (unit !== 'count') return `${qty} ${unit}`;
  const word = noun ? noun.replace(/s$/, '') : null;
  if (word) return `${qty} ${word}`;
  return qty === 1 ? '1 (whole thing)' : `${qty}`;
}

/** The four numbers, in the order the day is read in. Unknowns show as dashes
 *  rather than zeros — the distinction this whole redesign turns on. */
function MacroLine({ m }: { m: Macros }) {
  return (
    <span className="text-[12px] text-muted">
      <span className="stat font-medium text-text">{showMacro(m.calories)}</span> cal
      {' · '}
      <span className="stat">{showMacro(m.proteinG)}</span>P{' '}
      <span className="stat">{showMacro(m.carbsG)}</span>C{' '}
      <span className="stat">{showMacro(m.fatG)}</span>F
    </span>
  );
}

export function FoodEntry({ dayKey }: { dayKey: string }) {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState('');
  const [resolution, setResolution] = useState<Resolution | null>(null);
  // Set the moment the user touches the label card. Until then the card is a
  // live mirror of the text, which is what makes typing the facts and tapping
  // them in the same gesture rather than two competing ones.
  const [edited, setEdited] = useState<LabelDraft | null>(null);
  const [lastLog, setLastLog] = useState<{ entryId: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // --- live resolution ----------------------------------------------------
  // `seq` discards out-of-order responses: two keystrokes in flight can settle
  // backwards, and rendering the older one puts stale numbers under the caret.
  const seq = useRef(0);
  useEffect(() => {
    const query = text.trim();
    if (!query) {
      setResolution(null);
      return;
    }
    const ticket = ++seq.current;
    const timer = setTimeout(() => {
      resolveEntry(query)
        .then(found => {
          if (seq.current === ticket) setResolution(found);
        })
        .catch(err => {
          // Runs on every keystroke, so it can't raise a visible error.
          console.error('[FoodEntry] resolve failed', err);
          if (seq.current === ticket) setResolution(null);
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
    setResolution(null);
    setEdited(null);
    seq.current++;
  };

  // --- what's on screen ---------------------------------------------------

  const input = resolution?.input;
  const matches = resolution?.matches ?? [];
  const isNewFood = Boolean(input?.name) && matches.length === 0 && !resolution?.problem;

  // The card mirrors the text until the user edits it, then it owns itself.
  // Typing in the box again hands control back, so the text stays the thing in
  // charge and the card stays a refinement of it.
  const draft: LabelDraft | null = edited ?? (isNewFood && input ? draftFromInput(input) : null);

  const draftMacros: Macros = draft
    ? {
        calories: parseMacroField(draft.calories),
        proteinG: parseMacroField(draft.proteinG),
        carbsG: parseMacroField(draft.carbsG),
        fatG: parseMacroField(draft.fatG),
      }
    : {};
  const draftServings = draft ? Number(draft.servings) || 1 : 1;

  const setDraft = (patch: Partial<LabelDraft>) => {
    if (!draft) return;
    setEdited({ ...draft, ...patch });
  };

  // --- actions ------------------------------------------------------------

  const logMatch = async (match: Match) => {
    setBusy(true);
    try {
      const entryId = await logMeal({
        food: match.food,
        servings: match.servings,
        dayKey,
      });
      setLastLog({ entryId, label: `${match.food.name} · ${showMacro(match.totals.calories)} kcal` });
      reset();
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!draft || !draft.name.trim()) return;
    setBusy(true);
    try {
      const qty = Number(draft.servingQty) || 1;
      const { entryId } = await saveLabelAndLog({
        label: {
          name: draft.name.trim(),
          servingQty: qty,
          servingUnit: draft.servingUnit,
          servingLabel: servingLabelFrom(qty, draft.servingUnit, draft.servingNoun),
          macros: draftMacros,
        },
        servings: draftServings,
        dayKey,
        foodId: draft.foodId,
      });
      const total = scaleMacros(draftMacros, draftServings);
      setLastLog({ entryId, label: `${draft.name.trim()} · ${showMacro(total.calories)} kcal` });
      reset();
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (busy) return;
    if (draft) void saveDraft();
    else if (matches.length) void logMatch(matches[0]);
  };

  const handleUndo = async () => {
    if (!lastLog) return;
    await undoMealLog(lastLog.entryId);
    setLastLog(null);
  };

  // --- render -------------------------------------------------------------

  const numField = (labelText: string, key: keyof LabelDraft, span?: string) => (
    <label className={cn('block', span)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{labelText}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder="—"
        value={(draft?.[key] as string) ?? ''}
        onChange={e => setDraft({ [key]: e.target.value } as Partial<LabelDraft>)}
        className={cn(field, 'stat')}
      />
    </label>
  );

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
          onChange={e => {
            setText(e.target.value);
            setEdited(null);
          }}
          placeholder="What did you eat?"
          aria-label="What did you eat"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || (!draft && !matches.length)}
          aria-label={draft ? 'Save and log' : 'Log it'}
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full',
            'bg-accent-solid text-on-accent disabled:opacity-30',
            press,
            'transition-[opacity,transform] duration-150 ease-out-soft',
            focusRing,
          )}
        >
          <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
        </button>
      </form>

      {/* Known foods. The row states the amount it worked out BEFORE the
          numbers it produced, because that's the step that can be wrong. */}
      {matches.length > 0 && (
        <motion.ul
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-card divide-y divide-hairline"
        >
          {matches.map((m, i) => (
            <li key={m.food.id} className="flex items-stretch">
              <button
                type="button"
                onClick={() => void logMatch(m)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left',
                  '[@media(hover:hover)]:hover:bg-surface-2',
                  press,
                  'transition-[background-color,transform] duration-150 ease-out-soft',
                  focusRing,
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-text">
                    {m.food.name}
                  </span>
                  <span className="mt-0.5 block truncate">
                    <span className="stat text-[12px] text-muted">{m.amountLabel}</span>
                    <span className="text-[12px] text-faint"> · </span>
                    <MacroLine m={m.totals} />
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'hidden shrink-0 rounded-xs border px-1.5 py-0.5 text-[10px] font-medium',
                    '[@media(hover:hover)]:block',
                    i === 0 ? 'border-hairline text-faint' : 'border-transparent text-transparent',
                  )}
                >
                  ↵
                </span>
              </button>
              {/* Correcting a food you already have is the same card as creating
                  one — there is only one way facts ever get into a row. */}
              <button
                type="button"
                aria-label={`Edit ${m.food.name}`}
                onClick={() => input && setEdited(draftFromInput(input, m.food))}
                className={cn(
                  'grid w-11 shrink-0 place-items-center border-l border-hairline text-faint',
                  '[@media(hover:hover)]:hover:text-muted',
                  press,
                  focusRing,
                )}
              >
                <Pencil size={13} aria-hidden />
              </button>
            </li>
          ))}
        </motion.ul>
      )}

      {/* A name matched but the amount couldn't be applied to it. Refusing with
          a reason beats logging "your usual" and saying nothing. */}
      {resolution?.problem && !draft && (
        <p
          className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2.5 text-[13px] leading-relaxed text-warn"
          role="alert"
        >
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          {resolution.problem}
        </p>
      )}

      {/* The label card. Shown for a food the app doesn't know, prefilled with
          anything the text already said, and never shown again for that name. */}
      {draft && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="rounded-lg border border-hairline bg-surface shadow-raised p-4 space-y-4"
        >
          <div>
            <p className="font-display text-[15px] font-semibold tracking-[-0.015em] text-text">
              {draft.foodId ? 'Edit this food' : 'New food'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              What's on the label for one serving? Leave anything you don't know
              blank — blank means unknown, and nothing gets guessed from it.
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={e => setDraft({ name: e.target.value })}
              className={field}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">One serving is</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={draft.servingQty}
                onChange={e => setDraft({ servingQty: e.target.value })}
                className={cn(field, 'stat w-20 shrink-0')}
              />
              <div className="min-w-0 flex-1">
                <Segmented
                  value={draft.servingUnit}
                  onChange={v => setDraft({ servingUnit: v })}
                  options={UNIT_OPTIONS}
                  ariaLabel="Serving unit"
                />
              </div>
            </div>
            <p className="mt-1.5 text-[11.5px] text-faint">
              {servingLabelFrom(Number(draft.servingQty) || 1, draft.servingUnit, draft.servingNoun)}
              {draft.servingUnit === 'count' &&
                ' — a whole meal, a packet, a bar: whatever one of these is.'}
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2.5">
            {numField('Calories', 'calories', 'col-span-6')}
            {numField('Protein', 'proteinG', 'col-span-2')}
            {numField('Carbs', 'carbsG', 'col-span-2')}
            {numField('Fat', 'fatG', 'col-span-2')}
          </div>

          <div className="flex items-center gap-3 rounded-sm bg-surface-2 px-3 py-2.5">
            <label className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-medium text-muted">I had</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={draft.servings}
                onChange={e => setDraft({ servings: e.target.value })}
                className={cn(field, 'stat w-16')}
              />
            </label>
            <span className="min-w-0 flex-1 text-right">
              <MacroLine m={scaleMacros(draftMacros, draftServings)} />
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => (edited ? setEdited(null) : reset())}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="flex-1"
              onClick={() => void saveDraft()}
              disabled={busy || !draft.name.trim()}
            >
              Save &amp; log
            </Button>
          </div>
        </motion.div>
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
