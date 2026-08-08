// src/features/settings/AppearanceCard.tsx
// Theme preference: System (default) / Light / Dark. Applies immediately.

import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getThemePref, setThemePref, type ThemePref } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{ value: ThemePref; label: string; Icon: typeof Sun }> = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function AppearanceCard() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref());

  const choose = (next: ThemePref) => {
    setThemePref(next);
    setPref(next);
  };

  return (
    <Card className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h2 className="text-base font-semibold text-text">Appearance</h2>
      <div role="radiogroup" aria-label="Theme" className="flex gap-2">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={pref === value}
            onClick={() => choose(value)}
            className={cn(
              'h-16 flex-1 rounded-md border flex flex-col items-center justify-center gap-1.5 text-xs',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              pref === value
                ? 'bg-bg border-accent text-accent'
                : 'bg-bg border-border text-text hover:bg-border/40',
            )}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}
