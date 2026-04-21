import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { TabBar } from './TabBar';

/**
 * AppShell — top header + banner slot + route outlet + bottom tab bar (D-01).
 * The <header> and TabBar's <nav> provide implicit landmark roles.
 *
 * Plan 01-03 will mount <InstallBanner /> and <EvictionBanner /> in the banner
 * slot above {children}. This file deliberately only includes a comment marker.
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
          {/* Plan 01-03 mounts Install + Eviction banners HERE (above route outlet, inside content column). */}
          {children}
        </div>
      </main>

      <TabBar />
    </div>
  );
}
