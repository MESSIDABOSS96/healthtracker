import { useState } from 'react'
import { Panel } from '../components/Panel'
import { useStore, setStore } from '../lib/store'
import type { LibraryFood, Macros } from '../types'

export function SettingsView() {
  const store = useStore()
  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted">Settings</div>
        <h1 className="text-2xl font-semibold tracking-tight">Configure your tracker</h1>
      </header>

      <ExerciseListPanel
        title="PT exercises"
        description="Each one becomes a checkbox on Today. Reorder with the arrows."
        items={store.config.ptExercises}
        onChange={(items) =>
          setStore((s) => ({ ...s, config: { ...s.config, ptExercises: items } }))
        }
        placeholder="e.g. Wrist flexor stretch"
      />

      <MacroTargetsPanel
        targets={store.config.macroTargets}
        onChange={(t) =>
          setStore((s) => ({ ...s, config: { ...s.config, macroTargets: t } }))
        }
      />

      <FoodLibraryPanel
        items={store.config.foodLibrary}
        onChange={(items) =>
          setStore((s) => ({ ...s, config: { ...s.config, foodLibrary: items } }))
        }
      />

      <DangerPanel />
    </div>
  )
}

function ExerciseListPanel({
  title, description, items, onChange, placeholder,
}: {
  title: string
  description: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (items.includes(v)) {
      setDraft('')
      return
    }
    onChange([...items, v])
    setDraft('')
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const copy = items.slice()
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    onChange(copy)
  }

  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-text-dim">{description}</p>
      </div>

      <ul className="flex flex-col gap-2 mb-3">
        {items.map((name, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-lg bg-panel-2 border border-border px-3 py-2"
          >
            <span className="flex-1">{name}</span>
            <button
              onClick={() => move(i, -1)}
              className="text-muted hover:text-text disabled:opacity-30"
              disabled={i === 0}
              aria-label="Move up"
            >↑</button>
            <button
              onClick={() => move(i, 1)}
              className="text-muted hover:text-text disabled:opacity-30"
              disabled={i === items.length - 1}
              aria-label="Move down"
            >↓</button>
            <button
              onClick={() => remove(i)}
              className="text-muted hover:text-warn"
              aria-label={`Remove ${name}`}
            >✕</button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted">No exercises yet.</li>
        )}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          className="flex-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-accent text-white px-4 py-2 hover:bg-accent-dim transition-colors disabled:opacity-50"
          disabled={!draft.trim()}
        >
          Add
        </button>
      </form>
    </Panel>
  )
}

function MacroTargetsPanel({
  targets,
  onChange,
}: {
  targets: Macros
  onChange: (t: Macros) => void
}) {
  const set = (k: keyof Macros, v: string) => {
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0) return
    onChange({ ...targets, [k]: n })
  }
  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Macro targets</h2>
        <p className="text-sm text-text-dim">
          Food section completes when all four are hit.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumField label="Calories" suffix="kcal" value={targets.cals} onChange={(v) => set('cals', v)} />
        <NumField label="Protein" suffix="g" value={targets.p} onChange={(v) => set('p', v)} />
        <NumField label="Carbs" suffix="g" value={targets.c} onChange={(v) => set('c', v)} />
        <NumField label="Fat" suffix="g" value={targets.f} onChange={(v) => set('f', v)} />
      </div>
    </Panel>
  )
}

function NumField({
  label, suffix, value, onChange,
}: {
  label: string
  suffix: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-2 bg-panel-2 border border-border rounded-lg px-3 py-2 focus-within:border-accent">
        <input
          type="number"
          inputMode="numeric"
          className="w-full bg-transparent outline-none tabular-nums"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-text-dim text-sm">{suffix}</span>
      </div>
    </label>
  )
}

function FoodLibraryPanel({
  items, onChange,
}: {
  items: LibraryFood[]
  onChange: (items: LibraryFood[]) => void
}) {
  const [form, setForm] = useState({ name: '', cals: '', p: '', c: '', f: '' })
  const add = () => {
    const name = form.name.trim()
    if (!name) return
    const next: LibraryFood = {
      id: crypto.randomUUID(),
      name,
      cals: Number(form.cals) || 0,
      p: Number(form.p) || 0,
      c: Number(form.c) || 0,
      f: Number(form.f) || 0,
    }
    onChange([next, ...items])
    setForm({ name: '', cals: '', p: '', c: '', f: '' })
  }
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id))
  const update = (id: string, patch: Partial<LibraryFood>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Food library</h2>
        <p className="text-sm text-text-dim">
          Quick-log chips for foods you eat repeatedly.
        </p>
      </div>

      <ul className="flex flex-col gap-2 mb-3">
        {items.map((it) => (
          <LibraryRow
            key={it.id}
            food={it}
            onSave={(patch) => update(it.id, patch)}
            onRemove={() => remove(it.id)}
          />
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted">No saved foods yet.</li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="grid grid-cols-12 gap-2"
      >
        <input
          className="col-span-12 sm:col-span-4 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-2 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="kcal" type="number" inputMode="numeric"
          value={form.cals} onChange={(e) => setForm({ ...form, cals: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="P" type="number" inputMode="numeric"
          value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="C" type="number" inputMode="numeric"
          value={form.c} onChange={(e) => setForm({ ...form, c: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-right tabular-nums"
          placeholder="F" type="number" inputMode="numeric"
          value={form.f} onChange={(e) => setForm({ ...form, f: e.target.value })}
        />
        <button
          type="submit"
          className="col-span-12 sm:col-span-3 rounded-lg bg-accent text-white px-4 py-2 hover:bg-accent-dim transition-colors disabled:opacity-50"
          disabled={!form.name.trim()}
        >
          Add to library
        </button>
      </form>
    </Panel>
  )
}

function LibraryRow({
  food, onSave, onRemove,
}: {
  food: LibraryFood
  onSave: (patch: Omit<LibraryFood, 'id'>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: food.name,
    cals: String(food.cals),
    p: String(food.p),
    c: String(food.c),
    f: String(food.f),
  })

  const beginEdit = () => {
    setDraft({
      name: food.name,
      cals: String(food.cals),
      p: String(food.p),
      c: String(food.c),
      f: String(food.f),
    })
    setEditing(true)
  }

  const save = (e?: React.FormEvent) => {
    e?.preventDefault()
    const name = draft.name.trim()
    if (!name) return
    onSave({
      name,
      cals: Number(draft.cals) || 0,
      p: Number(draft.p) || 0,
      c: Number(draft.c) || 0,
      f: Number(draft.f) || 0,
    })
    setEditing(false)
  }

  if (!editing) {
    return (
      <li className="flex items-center gap-3 rounded-lg bg-panel-2 border border-border px-3 py-2">
        <span className="flex-1 truncate">{food.name}</span>
        <span className="text-sm text-text-dim tabular-nums">
          {food.cals} kcal · {food.p}P / {food.c}C / {food.f}F
        </span>
        <button
          onClick={beginEdit}
          className="text-muted hover:text-text"
          aria-label={`Edit ${food.name}`}
          title="Edit"
        >
          <PencilIcon />
        </button>
        <button
          onClick={onRemove}
          className="text-muted hover:text-warn"
          aria-label={`Remove ${food.name}`}
        >✕</button>
      </li>
    )
  }

  return (
    <li className="rounded-lg bg-panel-2 border border-accent/40 px-3 py-2">
      <form onSubmit={save} className="grid grid-cols-12 gap-2 items-center">
        <input
          autoFocus
          className="col-span-12 sm:col-span-4 bg-panel border border-border rounded-md px-2 py-1.5 outline-none focus:border-accent"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-2 bg-panel border border-border rounded-md px-2 py-1.5 outline-none focus:border-accent text-right tabular-nums"
          type="number" inputMode="numeric" placeholder="kcal"
          value={draft.cals}
          onChange={(e) => setDraft({ ...draft, cals: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel border border-border rounded-md px-2 py-1.5 outline-none focus:border-accent text-right tabular-nums"
          type="number" inputMode="numeric" placeholder="P"
          value={draft.p}
          onChange={(e) => setDraft({ ...draft, p: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel border border-border rounded-md px-2 py-1.5 outline-none focus:border-accent text-right tabular-nums"
          type="number" inputMode="numeric" placeholder="C"
          value={draft.c}
          onChange={(e) => setDraft({ ...draft, c: e.target.value })}
        />
        <input
          className="col-span-3 sm:col-span-1 bg-panel border border-border rounded-md px-2 py-1.5 outline-none focus:border-accent text-right tabular-nums"
          type="number" inputMode="numeric" placeholder="F"
          value={draft.f}
          onChange={(e) => setDraft({ ...draft, f: e.target.value })}
        />
        <div className="col-span-12 sm:col-span-3 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-dim hover:text-text hover:border-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent text-white px-3 py-1.5 text-sm hover:bg-accent-dim transition-colors disabled:opacity-50"
            disabled={!draft.name.trim()}
          >
            Save
          </button>
        </div>
      </form>
    </li>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DangerPanel() {
  const exportJson = () => {
    const raw = localStorage.getItem('healthtracker.v1') ?? '{}'
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `healthtracker-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const wipe = () => {
    if (!confirm('Erase ALL tracker data? This cannot be undone.')) return
    localStorage.removeItem('healthtracker.v1')
    window.location.reload()
  }
  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Backup & data</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportJson}
          className="rounded-lg border border-border px-4 py-2 hover:border-accent transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={wipe}
          className="rounded-lg border border-warn/40 text-warn/90 px-4 py-2 hover:bg-warn/10 transition-colors"
        >
          Erase all data
        </button>
      </div>
    </Panel>
  )
}
