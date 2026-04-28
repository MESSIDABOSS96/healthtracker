import type { Store } from '../types'
import { addDays, todayKey } from './dayKey'
import { dayStatus } from './completion'
import { emptyDay } from '../types'

export function currentStreak(store: Store): number {
  let key = todayKey()
  const today = store.days[key] ?? emptyDay()
  const todayDone = dayStatus(today, store.config).complete
  if (!todayDone) {
    key = addDays(key, -1)
  }
  let streak = 0
  while (true) {
    const d = store.days[key] ?? emptyDay()
    if (!dayStatus(d, store.config).complete) break
    streak++
    key = addDays(key, -1)
    if (streak > 3650) break
  }
  return streak
}
