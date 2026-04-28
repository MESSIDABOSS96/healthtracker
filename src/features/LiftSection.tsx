import { Panel } from '../components/Panel'
import { SectionHeader } from '../components/SectionHeader'
import { useUpdateDay } from '../lib/store'
import type { DayLog } from '../types'

type Props = { dayKey: string; day: DayLog }

export function LiftSection({ dayKey, day }: Props) {
  const update = useUpdateDay(dayKey)
  const lifted = !!day.lifted

  const setLifted = (v: boolean) => {
    update((d) => ({ ...d, lifted: v }))
  }

  return (
    <Panel>
      <SectionHeader title="Lifting" done={lifted} detail={lifted ? 'lifted' : 'not yet'} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setLifted(true)}
          className={`rounded-xl px-4 py-4 border text-base font-medium transition-colors ${
            lifted
              ? 'bg-good/15 border-good/50 text-good'
              : 'bg-panel-2 border-border hover:border-accent/60 text-text-dim'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setLifted(false)}
          className={`rounded-xl px-4 py-4 border text-base font-medium transition-colors ${
            !lifted
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
