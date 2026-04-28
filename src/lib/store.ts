import { useEffect, useState, useCallback } from 'react'
import { defaultStore, emptyDay, type Store, type DayLog } from '../types'

const KEY = 'healthtracker.v1'

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1) return defaultStore()
    return migrate(parsed)
  } catch {
    return defaultStore()
  }
}

function migrate(s: any): Store {
  const days: Record<string, DayLog> = {}
  for (const [k, raw] of Object.entries(s.days ?? {}) as [string, any][]) {
    days[k] = {
      ptDone: Array.isArray(raw.ptDone) ? raw.ptDone : [],
      lifted:
        typeof raw.lifted === 'boolean'
          ? raw.lifted
          : Array.isArray(raw.liftDone) && raw.liftDone.length > 0,
      meals: Array.isArray(raw.meals) ? raw.meals : [],
    }
  }
  const cfg = s.config ?? {}
  return {
    version: 1,
    config: {
      ptExercises: Array.isArray(cfg.ptExercises) ? cfg.ptExercises : [],
      macroTargets: cfg.macroTargets ?? defaultStore().config.macroTargets,
      foodLibrary: Array.isArray(cfg.foodLibrary) ? cfg.foodLibrary : [],
    },
    days,
  }
}

function save(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

let memory: Store = load()
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function getStore(): Store {
  return memory
}

export function setStore(updater: (s: Store) => Store) {
  memory = updater(memory)
  save(memory)
  emit()
}

export function useStore(): Store {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return memory
}

export function useDay(dayKey: string): DayLog {
  const s = useStore()
  return s.days[dayKey] ?? emptyDay()
}

export function updateDay(dayKey: string, fn: (d: DayLog) => DayLog) {
  setStore((s) => {
    const current = s.days[dayKey] ?? emptyDay()
    return { ...s, days: { ...s.days, [dayKey]: fn(current) } }
  })
}

export function useUpdateDay(dayKey: string) {
  return useCallback(
    (fn: (d: DayLog) => DayLog) => updateDay(dayKey, fn),
    [dayKey],
  )
}
