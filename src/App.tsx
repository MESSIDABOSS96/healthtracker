import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { TodayScreen } from './routes/TodayScreen';
import { CalendarScreen } from './routes/CalendarScreen';
import { SettingsScreen } from './routes/SettingsScreen';

// D-03: HashRouter sidesteps SW navigation-fallback edge cases and supports
// future deep links (e.g. /#/day/2026-04-20 in Phase 3).
export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
