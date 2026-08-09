// src/features/dashboard/ClosureGrid.tsx
// Closure history at a glance: a 7-row (weekday) grid of cells — full accent
// for closed days, dim for partial days, track for empty. Today carries a ring
// so the sequence has an anchor; without it the grid is identical squares and
// you can't tell which end you're reading toward.
//
// This card is the odd one out on the dashboard — it's the fifth of five, so
// on desktop it sits alone on its row and spans the full width. Rather than
// stretch twelve weeks across 1100px into absurd 90px squares, the desktop
// layout shows SIX MONTHS: 26 columns is roughly the right cell size for that
// width, and the extra history is the whole point of a wider screen.
// The older half is hidden below `lg`, where 26 columns would be unreadable.
//
// One useLiveQuery upstream; this component is pure presentation.

import { Link } from 'react-router-dom';
import type { DayClosure } from '@/services/closure.svc';
import { addDays, keyToDate } from '@/lib/dayKey';
import { Card, CardContent, CardHeader, CardMeta, CardTitle } from '@/components/ui/card';
import { dayPath } from '@/lib/dayRoutes';
import { focusRing } from '@/components/ui/styles';

const WEEKS_WIDE = 26;
const WEEKS_NARROW = 12;

interface ClosureGridProps {
  todayKey: string;
  closures: Map<string, DayClosure>;
  streak: number | undefined;
}

export function ClosureGrid({ todayKey, closures, streak }: ClosureGridProps) {
  // Columns are weeks (oldest → newest), rows are Mon..Sun.
  const todayDow = (keyToDate(todayKey).getDay() + 6) % 7; // 0 = Monday
  const gridStart = addDays(todayKey, -(todayDow + (WEEKS_WIDE - 1) * 7));

  const columns: string[][] = [];
  for (let w = 0; w < WEEKS_WIDE; w++) {
    const col: string[] = [];
    for (let d = 0; d < 7; d++) {
      col.push(addDays(gridStart, w * 7 + d));
    }
    columns.push(col);
  }

  const countClosed = (fromColumn: number) =>
    columns
      .slice(fromColumn)
      .flat()
      .filter(key => key <= todayKey && closures.get(key)?.closed).length;

  // Counted over the rendered cells, not the whole `closures` map: the map is
  // fetched for a flat day window while the grid starts on a Monday, so the
  // two disagree by up to six days and the header would contradict the squares.
  const closedWide = countClosed(0);
  const closedNarrow = countClosed(WEEKS_WIDE - WEEKS_NARROW);

  // Closed is a solid green fill. A partial day is mixed toward that same green
  // in proportion to how much of it landed, so the grid reads as a heat map of
  // effort rather than a row of identical "you tried" markers — a 90% day and a
  // 20% day are different facts and used to look the same.
  //
  // The mix is capped well below full: at 100% of the partial scale a cell must
  // still be obviously not-closed, or near-misses would impersonate wins and the
  // streak would look wrong. `color-mix` lands on --track at 0, so an empty day
  // needs no special case.
  //
  // Today's marker is an outset outline in the accent, which sits outside the
  // cell and therefore survives any fill.
  const PARTIAL_CEILING = 0.72;

  const cellStyle = (key: string): { style: React.CSSProperties; title: string } => {
    const isToday = key === todayKey;
    const ring = isToday ? { outline: '1.5px solid var(--accent)', outlineOffset: '2px' } : {};

    if (key > todayKey) return { style: { backgroundColor: 'transparent' }, title: '' };

    const c = closures.get(key);
    if (c?.closed) {
      return { style: { backgroundColor: 'var(--closed)', ...ring }, title: `${key} — closed` };
    }

    const progress = c?.progress ?? 0;
    if (progress <= 0) {
      return { style: { backgroundColor: 'var(--track)', ...ring }, title: `${key} — empty` };
    }
    const mix = Math.round(progress * PARTIAL_CEILING * 100);
    return {
      style: {
        backgroundColor: `color-mix(in srgb, var(--closed) ${mix}%, var(--track))`,
        ...ring,
      },
      title: `${key} — ${Math.round(progress * 100)}%`,
    };
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Closed days</CardTitle>
        <CardMeta>
          <span className="lg:hidden">{closedNarrow} in 12 weeks</span>
          <span className="hidden lg:inline">{closedWide} in 6 months</span>
          {streak !== undefined && streak > 0 && <> · {streak} day streak</>}
        </CardMeta>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <div
          className="flex gap-[3px] lg:gap-1"
          role="group"
          aria-label={`Closed-day history for the last ${WEEKS_WIDE} weeks — open a day to edit it`}
        >
          {columns.map((col, i) => (
            <div
              key={i}
              className={[
                'flex flex-1 flex-col gap-[3px] lg:gap-1',
                // The older half only exists on wide screens.
                i < WEEKS_WIDE - WEEKS_NARROW ? 'hidden lg:flex' : '',
              ].join(' ')}
            >
              {col.map(key => {
                const { style, title } = cellStyle(key);
                const cellClass = 'block aspect-square w-full rounded-[3.5px] lg:rounded-[5px]';

                // Future days aren't places you can go, so they stay inert.
                if (key > todayKey) {
                  return <div key={key} className={cellClass} style={style} aria-hidden />;
                }

                return (
                  <Link
                    key={key}
                    to={dayPath(key, todayKey)}
                    title={title}
                    aria-label={title}
                    className={`${cellClass} transition-[filter] duration-150 ease-out-soft [@media(hover:hover)]:hover:brightness-95 ${focusRing}`}
                    style={style}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <ul className="mt-3 flex items-center gap-4 text-[11.5px] text-muted" aria-hidden>
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: 'var(--closed)' }}
            />
            Closed
          </li>
          {/* Two partial swatches, not one — a single mid-tone wouldn't show
              that the shade itself carries the day's percentage. */}
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: 'color-mix(in srgb, var(--closed) 22%, var(--track))' }}
            />
            <span
              className="-ml-1 inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: 'color-mix(in srgb, var(--closed) 58%, var(--track))' }}
            />
            Partial
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
