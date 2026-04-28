import { Panel } from '../components/Panel'
import { SectionHeader } from '../components/SectionHeader'
import { useStore, useUpdateDay } from '../lib/store'
import { ptStatus } from '../lib/completion'
import type { DayLog } from '../types'

type Props = { dayKey: string; day: DayLog }

export function PTSection({ dayKey, day }: Props) {
  const store = useStore()
  const update = useUpdateDay(dayKey)
  const list = store.config.ptExercises
  const status = ptStatus(day, store.config)
  const detail = list.length > 0 ? `${day.ptDone.filter((n) => list.includes(n)).length}/${list.length}` : 'none configured'

  const toggle = (name: string) => {
    update((d) => ({
      ...d,
      ptDone: d.ptDone.includes(name) ? d.ptDone.filter((n) => n !== name) : [...d.ptDone, name],
    }))
  }

  return (
    <Panel>
      <SectionHeader title="PT" done={status.done} detail={detail} />
      {list.length === 0 ? (
        <p className="text-sm text-muted">
          Add your PT exercises in Settings to start tracking.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((name) => {
            const checked = day.ptDone.includes(name)
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-colors ${
                    checked
                      ? 'bg-good/10 border-good/40 text-text'
                      : 'bg-panel-2 border-border hover:border-accent/60'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-good border-good text-bg' : 'border-border'
                    }`}
                    aria-hidden
                  >
                    {checked && '✓'}
                  </span>
                  <span className={checked ? 'line-through text-text-dim' : ''}>{name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
