import { Card, CardHeader, CardTitle, CardMeta, CardContent } from 'vzn';

// CardTitle is the app's one card-level heading: the display face (Instrument
// Sans), 15px, semibold, tightened tracking. Shown inside its Card because the
// header supplies the padding that makes the size read correctly.
const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14, maxWidth: 380 }}>{children}</div>
);

// The titles VZN actually uses, stacked so the face and weight are comparable.
export const RealTitles = () => (
  <Ground>
    <div className="space-y-3">
      {['Nutrition', 'Body weight', 'Closed days', 'Long-term goals', 'Eating trend'].map(t => (
        <Card key={t}>
          <CardHeader>
            <CardTitle>{t}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  </Ground>
);

// Against a numeric readout — the title holds its weight next to the tabular
// figures rather than competing with them.
export const BesideAReadout = () => (
  <Ground>
    <Card>
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Weekly training</CardTitle>
        <CardMeta>3 of 4 lifts</CardMeta>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted">One more to hit this week&apos;s target.</p>
      </CardContent>
    </Card>
  </Ground>
);

// A title long enough to wrap, so the leading-tight setting is visible.
export const Wrapping = () => (
  <Ground>
    <Card style={{ maxWidth: 220 }}>
      <CardHeader>
        <CardTitle>Projected arrival at goal weight</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="stat text-[22px] font-semibold text-text">14 Mar</span>
      </CardContent>
    </Card>
  </Ground>
);
