import { Card, CardHeader, CardTitle, CardMeta, CardContent, Meter } from 'vzn';

const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14 }}>{children}</div>
);

// The Nutrition card from the day screen — the canonical composition: header
// with a right-hand readout, content carrying macro meters.
export const Nutrition = () => (
  <Ground>
    <Card style={{ maxWidth: 380 }}>
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Nutrition</CardTitle>
        <CardMeta>1,840 / 2,000 kcal</CardMeta>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: 'Protein', value: 148, max: 180, color: 'var(--ring-food)' },
          { label: 'Carbs', value: 171, max: 180, color: 'var(--accent)' },
          { label: 'Fat', value: 52, max: 65, color: 'var(--ring-cardio)' },
        ].map(m => (
          <div key={m.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-muted">{m.label}</span>
              <span className="stat text-text">{m.value} / {m.max} g</span>
            </div>
            <Meter value={m.value} max={m.max} color={m.color} />
          </div>
        ))}
      </CardContent>
    </Card>
  </Ground>
);

export const Minimal = () => (
  <Ground>
    <Card style={{ maxWidth: 380 }}>
      <CardHeader>
        <CardTitle>Body weight</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] leading-relaxed text-muted">
          Weigh in each morning. The trend line uses a smoothed average, so a
          single heavy day never moves it much.
        </p>
      </CardContent>
    </Card>
  </Ground>
);

// Two cards side by side — how the dashboard reads, and proof the shadow and
// hairline separate a card from its neighbour as well as from the ground.
export const OnTheGround = () => (
  <Ground>
    <div className="flex flex-wrap gap-4">
      <Card style={{ minWidth: 190, flex: 1 }}>
        <CardHeader className="flex-row items-baseline justify-between">
          <CardTitle>Closed days</CardTitle>
          <CardMeta>18 in 12 weeks</CardMeta>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="stat text-[26px] font-semibold text-text">6</span>
            <span className="text-[13px] text-muted">day streak</span>
          </div>
        </CardContent>
      </Card>
      <Card style={{ minWidth: 190, flex: 1 }}>
        <CardHeader className="flex-row items-baseline justify-between">
          <CardTitle>Goal weight</CardTitle>
          <CardMeta>-8.4 lb to go</CardMeta>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="stat text-[26px] font-semibold text-text">183.6</span>
            <span className="text-[13px] text-muted">lb</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </Ground>
);
