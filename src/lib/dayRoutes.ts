// src/lib/dayRoutes.ts
// Where a given day lives in the router. Today is /daily (the tab), every other
// day is /day/:dayKey — one URL per day, so the grid, the day arrows and deep
// links all agree. Kept out of any component file so the dashboard chunk can
// link to a day without pulling the day-navigation UI in with it.

export function dayPath(dayKey: string, todayKey: string): string {
  return dayKey === todayKey ? '/daily' : `/day/${dayKey}`;
}
