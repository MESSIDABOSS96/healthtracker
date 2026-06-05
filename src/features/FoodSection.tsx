import { useState } from 'react'
import { Panel } from '../components/Panel'
import { SectionHeader } from '../components/SectionHeader'
import { MacroBar } from '../components/MacroBar'
import { useStore, useUpdateDay, setStore } from '../lib/store'
import { foodStatus } from '../lib/completion'
import type { DayLog, Macros, Meal } from '../types'

type Props = { dayKey: string; day: DayLog }

const blank: { name: string; cals: string; p: string; c: string; f: string } = {
  name: '',
  cals: '',
  p: '',
  c: '',
  f: '',
}

export function FoodSection({ dayKey, day }: Props) {
  const store = useStore()
  const update = useUpdateDay(dayKey)
  const targets = store.config.macroTargets
  const status = foodStatus(day, store.config)
  const totals = status.totals
  const [form, setForm] = useState(blank)

  const parseForm = (): (Macros & { name: string }) | null => {
    const name = form.name.trim()
    if (!name) return null
    const cals = Number(form.cals) || 0
    const p = Number(form.p) || 0
    const c = Number(form.c) || 0
    const f = Number(form.f) || 0
    return { name, cals, p, c, f }
  }

  const addMeal = (m: Macros & { name: string }) => {
    const meal: Meal = {
      id: crypto.randomUUID(),
      at: Date.now(),
      ...m,
    }
    update((d) => ({ ...d, meals: [...d.meals, meal] }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const m = parseForm()
    if (!m) return
    addMeal(m)
    setForm(blank)
  }

  const saveToLibrary = () => {
    const m = parseForm()
    if (!m) return
    setStore((s) => ({
      ...s,
      config: {
        ...s.config,
        foodLibrary: [
          { id: crypto.randomUUID(), ...m },
          ...s.config.foodLibrary,
        ],
      },
    }))
    addMeal(m)
    setForm(blank)
  }

  const removeMeal = (id: string) =>
    update((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }))

  return (
    <Panel>
      <SectionHeader
        title="Food"
        done={status.done}
        detail={
          status.calsExceeded
            ? `${Math.round(totals.p)}/${targets.p}P · ${Math.round(totals.c)}/${targets.c}C · over kcal`
            : `${Math.round(totals.p)}/${targets.p}P · ${Math.round(totals.c)}/${targets.c}C`
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-5">
        <MacroBar label="Calories" current={totals.cals} target={targets.cals} unit=" kcal" kind="cap" />
        <MacroBar label="Protein" current={totals.p} target={targets.p} kind="goal" />
        <MacroBar label="Carbs" current={totals.c} target={targets.c} kind="info" />
        <MacroBar label="Fat" current={totals.f} target={targets.f} kind="info" />
      </div>

      <form onSubmit={submit} className="grid grid-cols-12 gap-2 mb-3">
        <input
          className="col-span-12 sm:col-span-4 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          placeholder="Meal name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-2 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="kcal"
          type="number"
          inputMode="numeric"
          value={form.cals}
          onChange={(e) => setForm({ ...form, cals: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="P"
          type="number"
          inputMode="numeric"
          value={form.p}
          onChange={(e) => setForm({ ...form, p: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="C"
          type="number"
          inputMode="numeric"
          value={form.c}
          onChange={(e) => setForm({ ...form, c: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="F"
          type="number"
          inputMode="numeric"
          value={form.f}
          onChange={(e) => setForm({ ...form, f: e.target.value })}
        />
        <div className="col-span-12 sm:col-span-3 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-accent text-white font-medium px-3 py-2 hover:bg-accent-dim transition-colors disabled:opacity-50"
            disabled={!form.name.trim()}
          >
            Log
          </button>
          <button
            type="button"
            onClick={saveToLibrary}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent transition-colors disabled:opacity-50"
            disabled={!form.name.trim()}
            title="Save to library and log"
          >
            Save
          </button>
        </div>
      </form>

      {store.config.foodLibrary.length > 0 && (
        <div className="mb-5">
          <ChipRow
            label="Library"
            items={store.config.foodLibrary.map((f) => ({
              key: f.id,
              label: f.name,
              onClick: () =>
                addMeal({ name: f.name, cals: f.cals, p: f.p, c: f.c, f: f.f }),
            }))}
          />
        </div>
      )}

      {day.meals.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">
            Today's meals
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {day.meals.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="truncate">{m.name}</span>
                <span className="text-sm text-text-dim tabular-nums shrink-0">
                  {Math.round(m.cals)} kcal · {Math.round(m.p)}P / {Math.round(m.c)}C / {Math.round(m.f)}F
                </span>
                <button
                  type="button"
                  onClick={() => removeMeal(m.id)}
                  className="text-xs text-muted hover:text-warn transition-colors"
                  aria-label={`Remove ${m.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

type ChipItem = { key: string; label: string; onClick: () => void }

function ChipRow({ label, items }: { label: string; items: ChipItem[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={it.onClick}
            className="rounded-full bg-panel-2 border border-border px-3 py-1 text-sm hover:border-accent transition-colors"
          >
            + {it.label}
          </button>
        ))}
      </div>
    </div>
  )
}
