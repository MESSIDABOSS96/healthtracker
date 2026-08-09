import { Segmented } from 'vzn';

const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14, maxWidth: 380 }}>{children}</div>
);

const BUCKETS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const;

// The meal picker on the confirm card. Selection is a surface-and-shadow swap:
// the active option rides on --surface inside a recessed --surface-2 trough.
export const MealBucket = () => (
  <Ground>
    <Segmented value="dinner" onChange={() => {}} options={BUCKETS} ariaLabel="Meal" />
  </Ground>
);

export const TwoOptions = () => (
  <Ground>
    <Segmented
      value="lb"
      onChange={() => {}}
      options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]}
      ariaLabel="Weight unit"
    />
  </Ground>
);

// Theme picker from Settings, shown with each option selected in turn so the
// active-vs-resting treatment is legible without interacting.
export const SelectionStates = () => {
  const opts = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  return (
    <Ground>
      <div className="space-y-3">
        {opts.map(o => (
          <Segmented key={o.value} value={o.value} onChange={() => {}} options={opts} ariaLabel="Theme" />
        ))}
      </div>
    </Ground>
  );
};
