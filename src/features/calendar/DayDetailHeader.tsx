// src/features/calendar/DayDetailHeader.tsx
// Day Detail top chrome — Back affordance, date label, (today) suffix when
// applicable, and a reserved-empty right slot (Phase 4 may add "Export day"
// there per RESEARCH §9 Phase 4 hook-in note). Header is NOT sticky (UI-SPEC:496).

import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { keyToDate, todayKey } from '@/lib/dayKey';

export interface DayDetailHeaderProps {
  dayKey: string;
}

export function DayDetailHeader({ dayKey }: DayDetailHeaderProps) {
  const navigate = useNavigate();
  const d = keyToDate(dayKey);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const month = d.toLocaleDateString(undefined, { month: 'long' });
  const day = d.getDate();
  const isToday = dayKey === todayKey();

  return (
    <div className="flex items-center justify-between h-14 border-b border-border">
      <button
        type="button"
        onClick={() => navigate('/calendar')}
        aria-label="Back to calendar"
        className={
          'flex items-center gap-1 -ml-2 p-2 rounded-md ' +
          'text-muted ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
        }
      >
        <ChevronLeft size={20} aria-hidden="true" />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex flex-col items-center">
        <h1 className="text-base font-semibold text-text">{`${weekday}, ${month} ${day}`}</h1>
        {isToday && <span className="text-xs text-muted">(today)</span>}
      </div>

      {/* Right slot reserved empty — Phase 4 may add "Export day" */}
      <div className="w-[56px]" aria-hidden="true" />
    </div>
  );
}
