// src/features/settings/AppearanceCard.tsx
// Theme preference: System / Light (default) / Dark. Applies immediately.
// System is still offered — it is just no longer what you get by not choosing.

import { useState } from 'react';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';
import { getThemePref, setThemePref, type ThemePref } from '@/lib/theme';
import { SettingsCard } from './SettingsCard';

const OPTIONS: ReadonlyArray<{ value: ThemePref; label: React.ReactNode }> = [
  { value: 'system', label: <Option Icon={Monitor} text="System" /> },
  { value: 'light', label: <Option Icon={Sun} text="Light" /> },
  { value: 'dark', label: <Option Icon={Moon} text="Dark" /> },
];

function Option({ Icon, text }: { Icon: typeof Sun; text: string }) {
  return (
    <span className="flex flex-col items-center justify-center gap-1.5">
      <Icon size={17} aria-hidden />
      {text}
    </span>
  );
}

export function AppearanceCard() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref());

  const choose = (next: ThemePref) => {
    setThemePref(next);
    setPref(next);
  };

  return (
    <SettingsCard title="Appearance" icon={Palette}>
      <Segmented
        value={pref}
        onChange={choose}
        options={OPTIONS}
        ariaLabel="Theme"
        itemClassName="h-16 text-[12px]"
      />
    </SettingsCard>
  );
}
