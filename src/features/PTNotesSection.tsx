import { Panel } from '../components/Panel'
import { useUpdateDay } from '../lib/store'
import type { DayLog } from '../types'

type Props = { dayKey: string; day: DayLog }

export function PTNotesSection({ dayKey, day }: Props) {
  const update = useUpdateDay(dayKey)

  return (
    <Panel>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">PT notes</h2>
        <span className="text-xs uppercase tracking-wider text-muted">
          saved automatically
        </span>
      </div>
      <textarea
        value={day.ptNotes}
        onChange={(e) =>
          update((d) => ({ ...d, ptNotes: e.target.value }))
        }
        rows={5}
        className="w-full resize-y bg-panel-2 border border-border rounded-xl px-4 py-3 outline-none focus:border-accent leading-relaxed placeholder:text-muted"
      />
    </Panel>
  )
}
