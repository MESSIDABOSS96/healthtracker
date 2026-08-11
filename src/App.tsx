import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { DailyScreen } from './routes/DailyScreen';
import { SettingsScreen } from './routes/SettingsScreen';
import { DayDetailScreen } from './routes/DayDetailScreen';

// Recharts only ships when the Dashboard is opened — keeps the Daily tab light.
const DashboardScreen = lazy(() =>
  import('./routes/DashboardScreen').then(m => ({ default: m.DashboardScreen })),
);

// D-03: HashRouter sidesteps SW navigation-fallback edge cases and supports
// deep links (e.g. /#/day/2026-08-08).
export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/daily" replace />} />
          {/* v1 route aliases so stale bookmarks/deep links keep working */}
          <Route path="/today" element={<Navigate to="/daily" replace />} />
          <Route path="/calendar" element={<Navigate to="/dashboard" replace />} />
          <Route path="/daily" element={<DailyScreen />} />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<div className="px-4 py-6 text-sm text-muted">Loading…</div>}>
                <DashboardScreen />
              </Suspense>
            }
          />
          <Route path="/day/:dayKey" element={<DayDetailScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          {/* A sub-page of Settings, not a tab — it has no nav entry and links
              back to Settings itself. */}
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
