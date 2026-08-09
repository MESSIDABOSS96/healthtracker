import { Button } from 'vzn';

// Every card sits on --bg rather than the preview's white body: VZN cards and
// controls are surfaces that FLOAT on a tinted ground, and on pure white the
// hairline-and-shadow separation that defines them disappears.
const Ground = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', padding: 24, borderRadius: 14 }}>{children}</div>
);

export const Variants = () => (
  <Ground>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">Log it</Button>
      <Button variant="outline">Change</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Remove</Button>
    </div>
  </Ground>
);

export const Sizes = () => (
  <Ground>
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Save goals</Button>
      <Button size="default">Save goals</Button>
      <Button size="lg">Save goals</Button>
    </div>
  </Ground>
);

export const Disabled = () => (
  <Ground>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default" disabled>Log it</Button>
      <Button variant="outline" disabled>Change</Button>
      <Button variant="ghost" disabled>Cancel</Button>
    </div>
  </Ground>
);

// The pairing the confirm card actually uses: a quiet dismiss beside the
// committing action, both full-width halves.
export const ConfirmRow = () => (
  <Ground>
    <div className="flex gap-2" style={{ maxWidth: 380 }}>
      <Button type="button" variant="ghost" className="flex-1">Cancel</Button>
      <Button type="button" variant="default" className="flex-1">Log it</Button>
    </div>
  </Ground>
);
