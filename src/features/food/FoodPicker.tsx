// src/features/food/FoodPicker.tsx
//
// Search + tap-to-log + inline-create trigger + per-row overflow delete.
//
// D-17 — FOOD-02 scope note: create + delete only; edit deferred to v2.
// The overflow menu on each search row intentionally exposes ONLY "Delete food".
//
// B-01 fix — FOOD-02 delete affordance lives on the search row (guarded by
//           window.confirm — the ONE place in Phase 2 a native confirm fires,
//           because deleting a Food cascades an OPFS photo removal).
// B-02 fix — FoodPicker is the owner of BOTH `onLog` prop declaration AND the
//           filter-result row `onClick` wiring. FoodSheet (Task 3) passes down
//           the same handler it gives to the chip rows, so chip-tap and search-
//           row-tap produce identical log behaviour (shared handleChipLog).

import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useAllFoods } from './hooks';
import { FoodCreateForm } from './FoodCreateForm';
import { deleteFood } from '@/services/food.svc';
import type { Food } from '@/db/schema';

export interface FoodPickerProps {
  onLog: (food: Food) => void; // REQUIRED — parent (FoodSheet) passes handleChipLog
  onLogged: () => void; // fires after create-and-log completes; parent closes Sheet
}

export function FoodPicker({ onLog, onLogged }: FoodPickerProps) {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const allFoods = useAllFoods();

  const filtered = useMemo(() => {
    if (!allFoods) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allFoods.filter((f) => f.name.toLowerCase().includes(q));
  }, [allFoods, query]);

  const canCreate = query.trim().length > 0 && filtered.length === 0;

  if (showCreate) {
    return (
      <FoodCreateForm
        initialName={query}
        onSaved={() => {
          setShowCreate(false);
          setQuery('');
          onLogged();
        }}
        onCancel={() => setShowCreate(false)}
      />
    );
  }

  return (
    <div className="space-y-2 px-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your foods"
        aria-label="Search your foods"
        className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      />
      {/* Interactive filter-result rows — Task 2 owns both onLog (body) + delete (overflow). */}
      {query.trim() && filtered.length > 0 && (
        <ul className="divide-y divide-border">
          {filtered.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLog(f)}
                aria-label={`Log ${f.name}`}
                className="flex-1 text-left py-3 text-sm text-text hover:bg-border/40 rounded-md px-2"
              >
                {f.name}
              </button>
              <FoodRowOverflowMenu food={f} />
            </li>
          ))}
        </ul>
      )}
      {canCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 w-full py-3 text-sm text-text hover:bg-border/40 px-2 rounded-md"
        >
          <Plus className="w-4 h-4" aria-hidden />
          <span>Create "{query.trim()}"</span>
        </button>
      )}
    </div>
  );
}

// B-01 fix — FOOD-02 delete affordance lives on the search row (D-17 scope).
// Inline useState-toggle menu (matches the PTTemplateList overflow pattern —
// no shadcn DropdownMenu dependency).
function FoodRowOverflowMenu({ food }: { food: Food }) {
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setOpen(false);
    if (window.confirm(`Delete ${food.name}? This will remove its photo permanently.`)) {
      await deleteFood(food.id);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen((o) => !o)}
        className="h-11 w-11 flex items-center justify-center text-muted"
      >
        <MoreHorizontal className="w-5 h-5" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 bg-surface border border-border rounded-md shadow-lg overflow-hidden min-w-[160px]">
            <button
              type="button"
              onClick={handleDelete}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-border/40"
              style={{ color: '#ef4444' }}
            >
              Delete food
            </button>
          </div>
        </>
      )}
    </div>
  );
}
