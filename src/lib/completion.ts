import type { Config, DayLog, Macros } from '../types'
import { sumMacros } from '../types'

export type FoodStatus = {
  done: boolean
  ratio: number
  totals: Macros
  proteinHit: boolean
  carbsHit: boolean
  calsExceeded: boolean
}

export function foodStatus(day: DayLog, config: Config): FoodStatus {
  const t = config.macroTargets
  const totals = sumMacros(day.meals)

  const proteinHit = t.p > 0 ? totals.p >= t.p : true
  const carbsHit = t.c > 0 ? totals.c >= t.c : true
  const calsExceeded = t.cals > 0 && totals.cals > t.cals

  // Circle fills on protein + carbs + calories. Fat is tracked but doesn't gate.
  const done = proteinHit && carbsHit && !calsExceeded

  const proteinRatio = t.p > 0 ? Math.min(1, totals.p / t.p) : 1
  const carbsRatio = t.c > 0 ? Math.min(1, totals.c / t.c) : 1
  const ratio = done ? 1 : (proteinRatio + carbsRatio) / 2

  return { done, ratio, totals, proteinHit, carbsHit, calsExceeded }
}

export type DayStatus = {
  food: boolean
  foodRatio: number
  complete: boolean
}

export function dayStatus(day: DayLog, config: Config): DayStatus {
  const food = foodStatus(day, config)
  return { food: food.done, foodRatio: food.ratio, complete: food.done }
}
