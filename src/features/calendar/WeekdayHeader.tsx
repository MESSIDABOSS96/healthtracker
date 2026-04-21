// src/features/calendar/WeekdayHeader.tsx
// Static Sun..Sat row above the month grid. aria-hidden because each DayCell's
// aria-label already spells out the weekday name (UI-SPEC:379).

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function WeekdayHeader() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-7 gap-1 h-8 mb-2"
    >
      {DAYS.map((d) => (
        <div
          key={d}
          className="flex items-center justify-center text-xs text-muted uppercase tracking-wide"
        >
          {d}
        </div>
      ))}
    </div>
  );
}
