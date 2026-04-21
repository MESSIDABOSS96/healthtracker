// src/routes/CalendarScreen.tsx
// Phase 3 — Calendar screen mounts the StreakCalendar composer inside the
// standard Phase-1/2 screen wrapper (matches TodayScreen rhythm). Outer
// AppShell header, tab bar, and safe-area insets are handled upstream by
// App.tsx + AppShell (Phase 1).

import { StreakCalendar } from '@/features/calendar/StreakCalendar';

export function CalendarScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      <StreakCalendar />
    </div>
  );
}
