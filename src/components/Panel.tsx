import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function Panel({ children, className = '' }: Props) {
  return (
    <section
      className={`rounded-2xl bg-panel border border-border p-5 ${className}`}
    >
      {children}
    </section>
  )
}
