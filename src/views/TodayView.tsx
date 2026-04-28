import { useStore, useDay } from '../lib/store'
import { todayKey, formatLong } from '../lib/dayKey'
import { dayStatus } from '../lib/completion'
import { currentStreak } from '../lib/streak'
import { PTSection } from '../features/PTSection'
import { LiftSection } from '../features/LiftSection'
import { FoodSection } from '../features/FoodSection'
import { IceSection } from '../features/IceSection'

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
            <div className="font-semibold text-good">Day complete</div>
            <div className="text-sm text-text-dim">
              All four areas done. Nice work.
            </div>
          </div>
        </div>
      )}

      <ProgressStrip
        pt={status.pt}
        lift={status.lift}
        food={status.food}
        ice={status.ice}
      />

      <PTSection dayKey={dayKey} day={day} />
      <LiftSection dayKey={dayKey} day={day} />
      <FoodSection dayKey={dayKey} day={day} />
      <IceSection dayKey={dayKey} day={day} />
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

function ProgressStrip({
  pt, lift, food, ice,
}: {
  pt: boolean; lift: boolean; food: boolean; ice: boolean
}) {
  const segs: { name: string; done: boolean }[] = [
    { name: 'PT', done: pt },
    { name: 'Lift', done: lift },
    { name: 'Food', done: food },
    { name: 'Ice', done: ice },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {segs.map((s) => (
        <div
          key={s.name}
          className={`rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors ${
            s.done
              ? 'bg-good/15 border-good/40 text-good'
              : 'bg-panel border-border text-text-dim'
          }`}
        >
          {s.name}
        </div>
      ))}
    </div>
  )
}
