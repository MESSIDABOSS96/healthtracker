import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { dateToKey, todayKey } from '../lib/dayKey'
import { dayStatus } from '../lib/completion'
import { currentStreak } from '../lib/streak'
import { emptyDay } from '../types'

type Props = { onOpenDay: (dayKey: string) => void }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_HEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarView({ onOpenDay }: Props) {
  const store = useStore()
  const today = todayKey()
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })

  const cells = useMemo(() => buildCells(view.y, view.m), [view.y, view.m])
  const streak = currentStreak(store)

  const monthComplete = useMemo(() => {
    let count = 0
    let total = 0
    for (const c of cells) {
      if (!c.inMonth) continue
      total++
      const d = store.days[c.key] ?? emptyDay()
      if (dayStatus(d, store.config).complete) count++
    }
    return { count, total }
  }, [cells, store.days, store.config])

  const goPrev = () => {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  }
  const goNext = () => {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Calendar</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {MONTHS[view.m]} {view.y}
          </h1>
        </div>
        <div className="rounded-full border border-border bg-panel px-3 py-1.5 flex items-center gap-2 text-sm">
          <span aria-hidden>🔥</span>
          <span className="tabular-nums font-semibold">{streak}</span>
          <span className="text-text-dim">streak</span>
        </div>
      </header>

      <div className="rounded-2xl bg-panel border border-border p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <IconButton onClick={goPrev} ariaLabel="Previous month">
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={goNext} ariaLabel="Next month">
              <ChevronRight />
            </IconButton>
          </div>
          <div className="text-sm text-text-dim tabular-nums">
            {monthComplete.count} / {monthComplete.total} complete
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAY_HEAD.map((w, i) => (
            <div key={i} className="text-xs text-muted text-center">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((c) => {
            const d = store.days[c.key] ?? emptyDay()
            const status = dayStatus(d, store.config)
            const isToday = c.key === today
            return (
              <button
                key={c.key + (c.inMonth ? '' : '-out')}
                type="button"
                onClick={() => c.inMonth && onOpenDay(c.key)}
                disabled={!c.inMonth}
                aria-label={c.key}
                className={`relative aspect-square rounded-xl flex items-center justify-center transition-colors ${
                  c.inMonth
                    ? 'hover:bg-panel-2 cursor-pointer'
                    : 'opacity-25 pointer-events-none'
                } ${isToday ? 'ring-1 ring-accent/70' : ''}`}
              >
                {c.inMonth && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RingForCell
                      pt={status.pt}
                      lift={status.lift}
                      foodDone={status.food}
                      foodFill={status.foodRatio}
                    />
                  </div>
                )}
                <span
                  className={`relative z-10 text-sm tabular-nums leading-none ${
                    status.complete
                      ? 'text-good font-semibold'
                      : isToday
                      ? 'text-accent font-semibold'
                      : 'text-text'
                  }`}
                >
                  {c.d}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type CellRingProps = {
  pt: boolean
  lift: boolean
  foodDone: boolean
  foodFill: number
}

function RingForCell(props: CellRingProps) {
  return (
    <div className="w-[78%] h-[78%]">
      <svg viewBox="0 0 44 44" className="w-full h-full block">
        <RingInner {...props} />
      </svg>
    </div>
  )
}

function RingInner({ pt, lift, foodDone, foodFill }: CellRingProps) {
  const stroke = 4
  const r = (44 - stroke) / 2
  const cx = 22
  const offsets = [0, -33.333, -66.666]
  const segLen = 28
  const allDone = pt && lift && foodDone

  const segments = [
    { fill: pt ? 1 : 0, complete: pt },
    { fill: lift ? 1 : 0, complete: lift },
    {
      fill: foodDone ? 1 : Math.max(0, Math.min(1, foodFill)),
      complete: foodDone,
    },
  ]

  return (
    <>
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
        strokeOpacity={0.45}
      />
      {segments.map((seg, i) => {
        const visible = segLen * seg.fill
        if (visible <= 0.01) return null
        const color = allDone
          ? 'var(--color-good)'
          : seg.complete
          ? 'var(--color-good)'
          : 'var(--color-accent)'
        return (
          <circle
            key={i}
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${visible} ${100 - visible}`}
            strokeDashoffset={offsets[i]}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: 'stroke 200ms ease, stroke-dasharray 200ms ease' }}
          />
        )
      })}
    </>
  )
}

function IconButton({
  onClick, ariaLabel, children,
}: {
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-9 h-9 rounded-full border border-border bg-panel-2 flex items-center justify-center text-text-dim hover:text-text hover:border-accent transition-colors"
    >
      {children}
    </button>
  )
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type Cell = { key: string; d: number; inMonth: boolean }

function buildCells(y: number, m: number): Cell[] {
  const first = new Date(y, m, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: Cell[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(y, m, -i)
    cells.push({ key: dateToKey(d), d: d.getDate(), inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m, day)
    cells.push({ key: dateToKey(d), d: day, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const next = cells.length - (startWeekday + daysInMonth) + 1
    const d = new Date(y, m + 1, next)
    cells.push({ key: dateToKey(d), d: d.getDate(), inMonth: false })
  }
  while (cells.length < 42) {
    const next = cells.length - (startWeekday + daysInMonth) + 1
    const d = new Date(y, m + 1, next)
    cells.push({ key: dateToKey(d), d: d.getDate(), inMonth: false })
  }
  return cells
}
