import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { TabBar } from './TabBar';
import { InstallBanner } from './InstallBanner';
import { EvictionBanner } from './EvictionBanner';

/**
 * AppShell — top header + banner slot + route outlet + bottom tab bar (D-01).
 * The <header> and TabBar's <nav> provide implicit landmark roles.
 *
 * Plan 01-03 mounts <InstallBanner /> and <EvictionBanner /> in the banner
 * slot above {children}. Per UI-SPEC §"Banner stacking rule" — Install first,
 * Eviction second, separated by space-y-3 (12px). Both banners self-guard
 * against rendering when their trigger conditions are unmet (return null), so
 * the wrapping container is always present but visually empty when neither
 * shows. The 16px top padding (px-4 pt-4) is harmless in the banner-less state
 * and matches Today's outer px-4 py-6 padding rhythm.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-bg text-text">
      <header className="safe-area-top sticky top-0 z-40 bg-surface border-b border-border">
        <div className="h-14 flex items-center justify-between px-4">
          <span className="text-xl font-semibold">HealthTracker</span>
          <Link
            to="/settings"
            aria-label="Settings"
            className="text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md p-2"
          >
            <SettingsIcon size={20} />
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="px-4 pt-4 space-y-3">
            <InstallBanner />
            <EvictionBanner />
          </div>
          {children}
        </div>
      </main>

      <TabBar />
    </div>
  );
}
