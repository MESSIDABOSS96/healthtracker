// src/features/closure/ringMath.ts
// SVG arc helpers for the 3-segment closure ring. Angles in degrees,
// 0° = 12 o'clock, clockwise.

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Clockwise arc path from startAngle to endAngle (must span < 360°). */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export interface RingSegment {
  key: 'food' | 'lift' | 'cardio';
  path: string;
}

/** Three equal segments starting at 12 o'clock, clockwise, with gaps between. */
export function ringSegments(cx: number, cy: number, r: number, gapDeg = 14): RingSegment[] {
  const span = 120 - gapDeg;
  const keys: RingSegment['key'][] = ['food', 'lift', 'cardio'];
  return keys.map((key, i) => {
    const start = i * 120 + gapDeg / 2;
    return { key, path: arcPath(cx, cy, r, start, start + span) };
  });
}
