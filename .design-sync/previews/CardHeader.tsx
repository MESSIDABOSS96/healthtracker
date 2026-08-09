import { Card, CardHeader, CardTitle, CardMeta, CardContent } from 'vzn';

// A header only exists inside a Card — it carries the card's top padding and
// the gap between its title and anything under it, so previewing it bare would
// show an unpadded div and teach the wrong thing.
const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14, maxWidth: 380 }}>{children}</div>
);

// The default: title stacked, content below.
export const TitleOnly = () => (
  <Ground>
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted">Everything logged so far.</p>
      </CardContent>
    </Card>
  </Ground>
);

// The common override: flex-row with a baseline-aligned readout on the right.
// This is what most VZN cards use, so it's worth showing as a first-class case.
export const WithMeta = () => (
  <Ground>
    <Card>
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Nutrition</CardTitle>
        <CardMeta>1,840 / 2,000 kcal</CardMeta>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted">Four entries across three meals.</p>
      </CardContent>
    </Card>
  </Ground>
);

// The header's own gap doing work: a supporting line under the title.
export const WithSubtitle = () => (
  <Ground>
    <Card>
      <CardHeader>
        <CardTitle>Long-term goals</CardTitle>
        <span className="text-xs text-muted">What you&apos;re working toward.</span>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted">Progress shows on the Dashboard.</p>
      </CardContent>
    </Card>
  </Ground>
);
