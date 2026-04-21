// src/features/calendar/DayDetailSection.tsx
// Generic section wrapper for Day Detail's four area cards (PT/Food/Steps/Lift).
// Mirrors the Card pattern used by src/features/food/FoodSection.tsx so the
// visual rhythm stays consistent with the Today screen.

import { type ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export interface DayDetailSectionProps {
  title: string;
  subtitle?: string;       // e.g. Food macros row; optional
  children: ReactNode;
}

export function DayDetailSection({ title, subtitle, children }: DayDetailSectionProps) {
  return (
    <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </Card>
  );
}
