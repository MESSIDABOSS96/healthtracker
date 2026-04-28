import type { Config, DayLog, Macros } from '../types'
import { sumMacros } from '../types'

export type AreaStatus = {
  done: boolean
  ratio: number
}

export function ptStatus(day: DayLog, config: Config): AreaStatus {
  const total = config.ptExercises.length
  if (total === 0) return { done: false, ratio: 0 }
  const done = day.ptDone.filter((n) => config.ptExercises.includes(n)).length
  return { done: done === total, ratio: done / total }
}

export function liftStatus(day: DayLog, _config: Config): AreaStatus {
  return { done: !!day.lifted, ratio: day.lifted ? 1 : 0 }
}

export type FoodStatus = AreaStatus & {
  totals: Macros
  proteinRatio: number
  calsExceeded: boolean
  proteinHit: boolean
}

export function foodStatus(day: DayLog, config: Config): FoodStatus {
  const t = config.macroTargets
  const totals = sumMacros(day.meals)
  const proteinRatio = t.p > 0 ? Math.min(1, totals.p / t.p) : 1
  const proteinHit = t.p > 0 ? totals.p >= t.p : true
  const calsExceeded = t.cals > 0 && totals.cals > t.cals
  const done = proteinHit && !calsExceeded
  return { done, ratio: proteinRatio, totals, proteinRatio, proteinHit, calsExceeded }
}

export type DayStatus = {
  pt: boolean
  lift: boolean
  food: boolean
  foodRatio: number
  complete: boolean
  count: number
}

export function dayStatus(day: DayLog, config: Config): DayStatus {
  const pt = ptStatus(day, config).done
  const lift = liftStatus(day, config).done
  const food = foodStatus(day, config)
  const count = (pt ? 1 : 0) + (lift ? 1 : 0) + (food.done ? 1 : 0)
  return {
    pt,
    lift,
    food: food.done,
    foodRatio: food.proteinRatio,
    complete: count === 3,
    count,
  }
}
