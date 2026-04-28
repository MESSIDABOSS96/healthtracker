import { useState } from 'react'
import { TodayView } from './views/TodayView'
import { CalendarView } from './views/CalendarView'
import { SettingsView } from './views/SettingsView'

type Tab = 'today' | 'calendar' | 'settings'
type Route =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'day'; dayKey: string; from: Tab }

function App() {
  const [route, setRoute] = useState<Route>({ kind: 'tab', tab: 'today' })

  const tab: Tab = route.kind === 'tab' ? route.tab : route.from

  return (
    <div className="min-h-full">
      <div className="max-w-3xl mx-auto px-5 py-6 pb-24">
        {route.kind === 'day' ? (
          <TodayView
            dayKey={route.dayKey}
            onBack={() => setRoute({ kind: 'tab', tab: route.from })}
          />
        ) : tab === 'today' ? (
          <TodayView />
        ) : tab === 'calendar' ? (
          <CalendarView
            onOpenDay={(dayKey) =>
              setRoute({ kind: 'day', dayKey, from: 'calendar' })
            }
          />
        ) : (
          <SettingsView />
        )}
      </div>

      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-bg/90 backdrop-blur">
        <div className="max-w-3xl mx-auto grid grid-cols-3">
          <TabButton
            active={route.kind === 'tab' && tab === 'today'}
            label="Today"
            icon="📋"
            onClick={() => setRoute({ kind: 'tab', tab: 'today' })}
          />
          <TabButton
            active={route.kind === 'tab' && tab === 'calendar'}
            label="Calendar"
            icon="📅"
            onClick={() => setRoute({ kind: 'tab', tab: 'calendar' })}
          />
          <TabButton
            active={route.kind === 'tab' && tab === 'settings'}
            label="Settings"
            icon="⚙️"
            onClick={() => setRoute({ kind: 'tab', tab: 'settings' })}
          />
        </div>
      </nav>
    </div>
  )
}

function TabButton({
  active, label, icon, onClick,
}: {
  active: boolean
  label: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 flex flex-col items-center gap-0.5 text-xs transition-colors ${
        active ? 'text-accent' : 'text-text-dim hover:text-text'
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default App
