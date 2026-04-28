type Props = {
  title: string
  done: boolean
  detail?: string
}

export function SectionHeader({ title, done, detail }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {done && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-good/15 text-good">
            <span aria-hidden>✓</span> done
          </span>
        )}
      </div>
      {detail && (
        <span className="text-sm text-text-dim tabular-nums">{detail}</span>
      )}
    </div>
  )
}
