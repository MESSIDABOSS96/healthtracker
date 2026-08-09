// src/features/dashboard/ChartLegend.tsx
// Shared legend strip for the dashboard charts. Each chart was drawing its own
// swatch row with slightly different sizes and gaps; one component keeps the
// three charts reading as one family.
//
// Swatch shape encodes the mark: a bar chart's series gets a square, a line's
// gets a rule, a scatter's gets a dot — so the legend matches what's plotted.

export type SwatchShape = 'bar' | 'line' | 'dot';

export interface LegendItem {
  label: string;
  color: string;
  shape?: SwatchShape;
}

const SHAPE_CLASS: Record<SwatchShape, string> = {
  bar: 'h-2.5 w-2.5 rounded-[3px]',
  line: 'h-[3px] w-4 rounded-full',
  dot: 'h-1.5 w-1.5 rounded-full',
};

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map(({ label, color, shape = 'bar' }) => (
        <li key={label} className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <span
            aria-hidden
            className={`inline-block shrink-0 ${SHAPE_CLASS[shape]}`}
            style={{ backgroundColor: color }}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Consistent empty state for a chart that has nothing to plot yet. Fills the
 *  card so that when desktop rows stretch to a common height, the message sits
 *  centred in the space rather than stranded at the top of it. */
export function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="grid h-full min-h-[7rem] place-items-center py-6 text-center text-[13px] leading-relaxed text-muted">
      {children}
    </p>
  );
}
