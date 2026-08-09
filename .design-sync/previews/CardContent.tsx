import { Card, CardHeader, CardTitle, CardMeta, CardContent, Meter, Button } from 'vzn';

// CardContent is the card's body padding — matched to CardHeader's sides so a
// title and the content under it share one left edge. Previewed inside a Card
// for that reason: the alignment IS the component.
const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14, maxWidth: 380 }}>{children}</div>
);

// Prose body — the settings-card shape.
export const Prose = () => (
  <Ground>
    <Card>
      <CardHeader>
        <CardTitle>AI fallback</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] leading-relaxed text-muted">
          Optional. Typing food already works offline: your own library, a
          bundled table of common foods, and any nutrition facts you type.
        </p>
      </CardContent>
    </Card>
  </Ground>
);

// A big number — content that is one figure and a unit.
export const Figure = () => (
  <Ground>
    <Card>
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Body weight</CardTitle>
        <CardMeta>−0.8 lb / week</CardMeta>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="stat text-[30px] font-semibold leading-none text-text">183.6</span>
          <span className="text-[13px] text-muted">lb</span>
        </div>
      </CardContent>
    </Card>
  </Ground>
);

// Composed content — meters and an action, using the spacing utilities the app
// applies through className rather than baking them into the component.
export const Composed = () => (
  <Ground>
    <Card>
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Nutrition</CardTitle>
        <CardMeta>1,840 / 2,000 kcal</CardMeta>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-muted">Protein</span>
            <span className="stat text-text">148 / 180 g</span>
          </div>
          <Meter value={148} max={180} color="var(--ring-food)" ariaLabel="Protein" />
        </div>
        <Button variant="outline" size="sm">Add food</Button>
      </CardContent>
    </Card>
  </Ground>
);
