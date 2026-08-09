import { Meter } from 'vzn';

const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14, maxWidth: 380 }}>{children}</div>
);

// The macro summary: one Meter per macro, each in the ring hue that macro
// carries everywhere else in the app.
export const MacroRows = () => (
  <Ground>
    <div className="space-y-3">
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
          <Meter value={m.value} max={m.max} color={m.color} ariaLabel={m.label} />
        </div>
      ))}
    </div>
  </Ground>
);

// 6px is the supporting row; 10px is a headline bar. Same primitive.
export const Thickness = () => (
  <Ground>
    <div className="space-y-4">
      <Meter value={1840} max={2000} size={10} color="var(--accent)" ariaLabel="Calories" />
      <Meter value={148} max={180} size={6} color="var(--ring-food)" ariaLabel="Protein" />
      <Meter value={3} max={4} size={4} color="var(--closed)" ariaLabel="Lifts this week" />
    </div>
  </Ground>
);

// Fill is clamped at 100% — a 2,600 of 2,000 day draws a full bar, never an
// overflowing one. Callers tint it to say "over" rather than letting the bar lie.
export const FillRange = () => (
  <Ground>
    <div className="space-y-4">
      {[
        { label: 'Empty', value: 0, color: 'var(--accent)' },
        { label: 'Part way', value: 780, color: 'var(--accent)' },
        { label: 'On target', value: 2000, color: 'var(--closed)' },
        { label: 'Over — clamped', value: 2600, color: 'var(--warn)' },
      ].map(m => (
        <div key={m.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-muted">{m.label}</span>
            <span className="stat text-text">{m.value} / 2,000</span>
          </div>
          <Meter value={m.value} max={2000} size={8} color={m.color} ariaLabel={m.label} />
        </div>
      ))}
    </div>
  </Ground>
);
