import { Card } from '@/components/ui/card';

/**
 * Today screen — Phase 1 placeholder layout per D-05.
 *
 * Status strings are LOCKED verbatim by UI-SPEC Copywriting Contract.
 * Title and status are stored as separate fields (rendered side-by-side
 * inside each Card) — see the sections array below for exact values.
 *
 * Phase 2 swaps the status slot for live data; the title slot and card frame stay.
 */
const sections = [
  { title: 'PT',    status: 'not logged yet' },
  { title: 'Food',  status: '0 / target cals' },
  { title: 'Steps', status: '—' },
  { title: 'Lift',  status: '☐' },
];

export function TodayScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      {sections.map(({ title, status }) => (
        <Card key={title} className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">{title}</h2>
            <span className="text-sm text-muted">{status}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
