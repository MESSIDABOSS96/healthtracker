// src/components/ui/index.ts
// Barrel for the shared primitives — the ones CLAUDE.md says to reach for
// before hand-rolling anything. Nothing in the app is required to import
// through here; the per-file paths still work and are what existing code uses.
//
// It exists because the design system needs a single addressable entry point:
// `.design-sync/` builds the claude.ai/design bundle from this file, so this
// list IS the published component surface. Adding a primitive here publishes
// it; leaving one out keeps it internal.

export { Button, buttonVariants, type ButtonProps } from './button';
export { Card, CardHeader, CardTitle, CardMeta, CardContent } from './card';
export { Meter } from './meter';
export { Segmented, type SegmentedOption } from './segmented';

// Shared class strings rather than components — the treatments that repeat
// across screens (focus ring, press feedback, input well, eyebrow, label).
export { focusRing, press, field, eyebrow, label } from './styles';
