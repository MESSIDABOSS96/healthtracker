import { Card, CardHeader, CardTitle, CardMeta, CardContent } from 'vzn';

// CardMeta is the small right-hand readout in a card header — trend, count,
// streak. It carries the `stat` class, so its digits are the display face with
// tabular figures: numbers in a column line up instead of shimmering.
const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14, maxWidth: 380 }}>{children}</div>
);

// The readouts VZN actually shows, stacked so the tabular alignment is visible
// down the right edge.
export const Readouts = () => (
  <Ground>
    <div className="space-y-3">
      {[
        ['Nutrition', '1,840 / 2,000 kcal'],
        ['Closed days', '18 in 12 weeks'],
        ['Body weight', '−0.8 lb / week'],
        ['Weekly training', '3 of 4 lifts'],
      ].map(([title, meta]) => (
        <Card key={title}>
          <CardHeader className="flex-row items-baseline justify-between">
            <CardTitle>{title}</CardTitle>
            <CardMeta>{meta}</CardMeta>
          </CardHeader>
        </Card>
      ))}
    </div>
  </Ground>
);

// Meta can carry more than one fact — the grid card runs a count and a streak
// together, separated rather than stacked.
export const Compound = () => (
  <Ground>
    <Card>
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Closed days</CardTitle>
        <CardMeta>18 in 12 weeks · 6 day streak</CardMeta>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted">Tap any square to open that day.</p>
      </CardContent>
    </Card>
  </Ground>
);
