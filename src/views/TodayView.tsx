import { useStore, useDay } from '../lib/store'
import { todayKey, formatLong } from '../lib/dayKey'
import { dayStatus } from '../lib/completion'
import { currentStreak } from '../lib/streak'
import { FoodSection } from '../features/FoodSection'
import { PTNotesSection } from '../features/PTNotesSection'

type Props = { dayKey?: string; onBack?: () => void }

export function TodayView({ dayKey: passedKey, onBack }: Props) {
  const store = useStore()
  const isToday = !passedKey
  const dayKey = passedKey ?? todayKey()
  const day = useDay(dayKey)
  const status = dayStatus(day, store.config)
  const streak = currentStreak(store)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">
            {isToday ? 'Today' : 'Day'}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatLong(dayKey)}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!isToday && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-text-dim hover:text-text"
            >
              ← back
            </button>
          )}
          <StreakPill streak={streak} />
        </div>
      </header>

      {status.complete && (
        <div className="rounded-2xl border border-good/40 bg-good/10 px-5 py-4 flex items-center gap-3">
          <div className="text-2xl" aria-hidden>🎯</div>
          <div>
            <div className="font-semibold text-good">Goals hit</div>
            <div className="text-sm text-text-dim">
              Protein, carbs, and calories all on target. Nice work.
            </div>
          </div>
        </div>
      )}

      <FoodSection dayKey={dayKey} day={day} />
      <PTNotesSection dayKey={dayKey} day={day} />
    </div>
  )
}

function StreakPill({ streak }: { streak: number }) {
  return (
    <div className="rounded-full border border-border bg-panel px-3 py-1.5 flex items-center gap-2 text-sm">
      <span aria-hidden>🔥</span>
      <span className="tabular-nums font-semibold">{streak}</span>
      <span className="text-text-dim">day{streak === 1 ? '' : 's'}</span>
    </div>
  )
}
