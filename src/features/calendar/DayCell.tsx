// src/features/calendar/DayCell.tsx
// Pure presentational primitive — the 4-quadrant activity cell of the month
// grid (42 instances per month). Takes {dayKey, filled, today, inMonth} props
// and renders a <button> containing a 2×2 CSS grid of colored quadrant divs.
//
// D-08 quadrant glance-map is LOCKED FOREVER:
//   NW = PT, NE = Food, SW = Steps, SE = Lift
// The order of the 4 child divs in grid-cols-2 grid-rows-2 flow (left-to-right,
// top-to-bottom) IS this map. DO NOT permute without a new CONTEXT decision.
//
// D-09 alpha ramp: a filled quadrant's alpha depends on the TOTAL count of
// filled quadrants that day (not which quadrant it is). 4/4 is the only state
// that hits --accent-100 saturation. 0/4 is all --surface — identical to the
// never-logged state (Pitfall #6: never red, never empty-shame).
//
// D-11 today-ring sits OUTSIDE the 2×2 grid via CSS outline — does not clip
// into quadrant fills. D-12: 4/4 gets NO extra chrome — solid fill IS the reward.
//
// This file MUST NOT import { db } from '@/db/db', MUST NOT call useLiveQuery,
// MUST NOT call useEffect for data fetch. All data arrives via props from
// MonthGrid's single useLiveQuery subscription (see hooks.ts + streak.svc.ts).
// Anti-Pattern 3 — per-cell IDB — is an auto-fail at plan-check.

import { useNavigate } from 'react-router-dom';
import { keyToDate } from '@/lib/dayKey';

export interface DayCellProps {
  dayKey: string;
  filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean };
  today: boolean;
  inMonth: boolean;
}

// Indexed by count (0..4). Unfilled quadrants always use --surface regardless
// of count; this array is consulted ONLY for filled quadrants. Index 0 is a
// placeholder (never read since a 0/4 day has no filled quadrants).
const ALPHA_VARS = [
  'var(--surface)',     // 0 — placeholder (never accessed for filled quadrant)
  'var(--accent-25)',   // 1/4
  'var(--accent-50)',   // 2/4
  'var(--accent-75)',   // 3/4
  'var(--accent-100)',  // 4/4
] as const;

function quadFill(filledFlag: boolean, count: number): string {
  return filledFlag ? ALPHA_VARS[count] : 'var(--surface)';
}

// D-08 NW→NE→SW→SE order for the areasFilledList in aria-label.
const AREA_ORDER: Array<{ key: keyof DayCellProps['filled']; label: string }> = [
  { key: 'pt',    label: 'PT' },
  { key: 'food',  label: 'food' },
  { key: 'steps', label: 'steps' },
  { key: 'lift',  label: 'lift' },
];

function buildAriaLabel(props: DayCellProps, count: number): string {
  const d = keyToDate(props.dayKey);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const month = d.toLocaleDateString(undefined, { month: 'long' });
  const day = d.getDate();
  const datePart = `${weekday}, ${month} ${day}`;

  let countPart: string;
  if (count === 0) {
    countPart = 'no logs';
  } else if (count === 4) {
    countPart = 'all 4 logged';
  } else {
    const filledAreas = AREA_ORDER.filter(a => props.filled[a.key]).map(a => a.label).join(', ');
    countPart = `${count} of 4 logged: ${filledAreas}`;
  }

  const base = `${datePart} — ${countPart}`;
  return props.today ? `${base}, today` : base;
}

export function DayCell(props: DayCellProps) {
  const { dayKey, filled, today, inMonth } = props;
  const navigate = useNavigate();

  const count =
    Number(filled.pt) + Number(filled.food) + Number(filled.steps) + Number(filled.lift);

  const dayOfMonth = keyToDate(dayKey).getDate();
  const ariaLabel = buildAriaLabel(props, count);

  const handleClick = () => {
    if (inMonth) navigate(`/day/${dayKey}`);
  };

  // D-11 today ring: CSS outline sits outside the box and does not push content.
  // Focus-visible ring (Phase 1 token stack) uses ring-2 at offset-2 — when
  // focused, the 2px ring visually supersedes the 1px today outline cleanly.
  const outlineStyle = today ? { outline: '1px solid var(--accent)', outlineOffset: '0px' } : undefined;

  return (
    <button
      type="button"
      role="gridcell"
      disabled={!inMonth}
      aria-disabled={!inMonth}
      aria-label={ariaLabel}
      onClick={handleClick}
      style={outlineStyle}
      className={
        'relative aspect-square ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
        'active:brightness-90 ' +
        'disabled:cursor-default'
      }
    >
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
        {/* NW = PT (D-08 LOCKED) */}
        <div style={{ backgroundColor: quadFill(filled.pt, count) }} />
        {/* NE = Food */}
        <div style={{ backgroundColor: quadFill(filled.food, count) }} />
        {/* SW = Steps */}
        <div style={{ backgroundColor: quadFill(filled.steps, count) }} />
        {/* SE = Lift */}
        <div style={{ backgroundColor: quadFill(filled.lift, count) }} />
      </div>
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs tabular-nums"
        style={{ color: inMonth ? 'var(--muted)' : 'var(--border)' }}
      >
        {dayOfMonth}
      </span>
    </button>
  );
}
