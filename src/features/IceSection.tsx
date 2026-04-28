import { Panel } from '../components/Panel'
import { SectionHeader } from '../components/SectionHeader'
import { useUpdateDay } from '../lib/store'
import type { DayLog } from '../types'

type Props = { dayKey: string; day: DayLog }

export function IceSection({ dayKey, day }: Props) {
  const update = useUpdateDay(dayKey)
  const iced = !!day.iced

  const setIced = (v: boolean) => {
    update((d) => ({ ...d, iced: v }))
  }

  return (
    <Panel>
      <SectionHeader title="Icing" done={iced} detail={iced ? 'iced' : 'not yet'} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIced(true)}
          className={`rounded-xl px-4 py-4 border text-base font-medium transition-colors ${
            iced
              ? 'bg-good/15 border-good/50 text-good'
              : 'bg-panel-2 border-border hover:border-accent/60 text-text-dim'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setIced(false)}
          className={`rounded-xl px-4 py-4 border text-base font-medium transition-colors ${
            !iced
              ? 'bg-panel-2 border-border text-text'
              : 'bg-panel-2 border-border hover:border-accent/60 text-text-dim'
          }`}
        >
          No
        </button>
      </div>
    </Panel>
  )
}
