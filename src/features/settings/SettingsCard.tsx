// src/features/settings/SettingsCard.tsx
// One frame for every Settings section. Each card used to bring its own
// `<Card className="bg-surface border border-border rounded-lg p-4 space-y-3">`
// plus a hand-rolled <h2>, which meant six near-identical headers that drifted
// in icon size, spacing and weight. The heading, the optional icon and the
// explanatory line are the same three parts every time — so they live here.

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  title: string;
  /** One line on what this section does. Optional — some sections are obvious. */
  description?: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: SettingsCardProps) {
  return (
    <Card className={cn('p-4 lg:p-5', className)}>
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-[-0.015em] text-text">
        {Icon && <Icon size={15} className="text-faint" aria-hidden />}
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </Card>
  );
}
