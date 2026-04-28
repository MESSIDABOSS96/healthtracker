type Kind = 'goal' | 'cap' | 'info'

type Props = {
  label: string
  current: number
  target: number
  unit?: string
  kind?: Kind
}

export function MacroBar({
  label, current, target, unit = 'g', kind = 'info',
}: Props) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const hit = target > 0 && current >= target
  const over = target > 0 && current > target

  let barColor = 'bg-accent'
  let valueColor = 'text-text'

  if (kind === 'goal') {
    if (hit) {
      barColor = 'bg-good'
      valueColor = 'text-good'
    }
  } else if (kind === 'cap') {
    if (over) {
      barColor = 'bg-warn'
      valueColor = 'text-warn'
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-text-dim">{label}</span>
        <span className="text-sm tabular-nums">
          <span className={valueColor}>{Math.round(current)}</span>
          <span className="text-text-dim"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-panel-2 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
