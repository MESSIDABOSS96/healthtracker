// src/features/settings/FoodLibraryCard.tsx
// Every food the app has learned, with the facts it will log them at.
//
// The library builds itself — there is no "create food" flow, items land here
// by being confirmed once — which made it the one store with no way to look at
// it. That's a bad property for the thing the composer trusts above the USDA
// table: a single wrong row silently repeats itself into every future log of
// that food, and until now the only way to correct one was to retype the whole
// entry with facts attached and hope the dedupe key matched.
//
// Facts are shown per SERVING, which is what the row actually stores. For a
// weighed food that's per 100g and the label says so; for a discrete one it's
// per item. Showing a normalized "per 100g" everywhere would be a lie about
// half the rows.
//
// Editing here changes what FUTURE logs use. Past entries keep their own
// denormalized totals — see updateFood.

import { useMemo, useState } from 'react';
import { Check, EyeOff, Library, Pencil, Search, Trash2, X } from 'lucide-react';
import type { Food } from '@/db/schema';
import { useAllFoods } from '@/features/food/hooks';
import { deleteFood, updateFood, unhideFoodInChips } from '@/services/food.svc';
import { SettingsCard } from './SettingsCard';
import { Button } from '@/components/ui/button';
import { field, focusRing } from '@/components/ui/styles';
import { parseMacroField, showMacro } from '@/lib/macros';
import { cn } from '@/lib/utils';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Past this many rows the list gets its own filter box rather than a scroll. */
const SEARCH_THRESHOLD = 8;

interface DraftFacts {
  name: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

/** Unknown stays an empty field — see the same note in MealEntryRow. */
const showField = (n: number | undefined) => (n === undefined ? '' : String(round1(n)));

function toDraft(food: Food): DraftFacts {
  return {
    name: food.name,
    calories: showField(food.calories),
    proteinG: showField(food.proteinG),
    carbsG: showField(food.carbsG),
    fatG: showField(food.fatG),
  };
}

export function FoodLibraryCard({ className }: { className?: string }) {
  const foods = useAllFoods();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftFacts | null>(null);

  const filtered = useMemo(() => {
    if (!foods) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    // Same any-order word match the composer's library tier uses, so searching
    // here and typing there don't disagree about what "tesco chicken" finds.
    const terms = q.split(/\s+/).filter(Boolean);
    return foods.filter(f => {
      const name = f.name.toLowerCase();
      return terms.every(t => name.includes(t));
    });
  }, [foods, query]);

  const startEdit = (food: Food) => {
    setEditingId(food.id);
    setDraft(toDraft(food));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async (food: Food) => {
    if (!draft) return;
    await updateFood(food.id, {
      name: draft.name,
      calories: parseMacroField(draft.calories),
      proteinG: parseMacroField(draft.proteinG),
      carbsG: parseMacroField(draft.carbsG),
      fatG: parseMacroField(draft.fatG),
    });
    cancelEdit();
  };

  const total = foods?.length ?? 0;

  return (
    <SettingsCard
      title="Food library"
      icon={Library}
      description="Every food you've logged, and the facts it gets logged with. Editing one changes what future logs use — days already recorded keep their own numbers."
      className={className}
    >
      {foods === undefined ? null : total === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted">
          Nothing yet. Foods land here automatically the first time you log them.
        </p>
      ) : (
        <div className="space-y-3">
          {total > SEARCH_THRESHOLD && (
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${total} foods`}
                aria-label="Search the food library"
                className={cn(field, 'pl-8')}
              />
            </div>
          )}

          {filtered?.length === 0 ? (
            <p className="text-[13px] text-muted">No food matches “{query.trim()}”.</p>
          ) : (
            // Capped rather than unbounded: the library only grows, and a card
            // that eventually runs for several screens turns every setting
            // below it into something you have to scroll past.
            <ul className="max-h-[22rem] divide-y divide-hairline overflow-y-auto">
              {filtered?.map(food =>
                editingId === food.id && draft ? (
                  <li key={food.id} className="space-y-3 py-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted">Name</span>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={e => setDraft({ ...draft, name: e.target.value })}
                        className={field}
                      />
                    </label>

                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted">
                        Per {food.servingLabel}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {(
                          [
                            ['kcal', 'calories'],
                            ['P', 'proteinG'],
                            ['C', 'carbsG'],
                            ['F', 'fatG'],
                          ] as const
                        ).map(([unitLabel, key]) => (
                          <label key={key} className="block">
                            <span className="mb-1 block text-[11px] text-faint">{unitLabel}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={draft[key]}
                              onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                              className={cn(field, 'stat')}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => void deleteFood(food.id)}
                      >
                        <Trash2 size={13} aria-hidden /> Delete
                      </Button>
                      <div className="flex-1" />
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                        <X size={13} aria-hidden /> Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => void saveEdit(food)}
                        disabled={!draft.name.trim()}
                      >
                        <Check size={13} aria-hidden /> Save
                      </Button>
                    </div>
                  </li>
                ) : (
                  <li key={food.id} className="group/food flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] text-text">{food.name}</span>
                        {food.hiddenAt && (
                          <EyeOff
                            size={12}
                            className="shrink-0 text-faint"
                            aria-label="Hidden from shortcuts"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                        <span className="stat">{showMacro(food.calories)}</span> kcal ·{' '}
                        <span className="stat">{showMacro(food.proteinG, 1)}</span>P{' '}
                        <span className="stat">{showMacro(food.carbsG, 1)}</span>C{' '}
                        <span className="stat">{showMacro(food.fatG, 1)}</span>F · per{' '}
                        {food.servingLabel}
                      </span>
                    </span>

                    {food.hiddenAt && (
                      <button
                        type="button"
                        onClick={() => void unhideFoodInChips(food.id)}
                        className={cn(
                          'shrink-0 rounded-sm px-2 py-1 text-[12px] font-medium text-accent',
                          '[@media(hover:hover)]:hover:bg-accent-wash',
                          focusRing,
                        )}
                      >
                        Unhide
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startEdit(food)}
                      aria-label={`Edit ${food.name}`}
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint',
                        '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/food:opacity-100',
                        'focus-visible:opacity-100',
                        'hover:bg-surface-2 hover:text-text',
                        'transition-[opacity,background-color,color] duration-150 ease-out-soft',
                        focusRing,
                      )}
                    >
                      <Pencil size={13} aria-hidden />
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </SettingsCard>
  );
}
