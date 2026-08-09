import { ChevronRight, Smartphone, Type } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getDeferredInstallPrompt, triggerInstallPrompt, isStandalone } from '@/lib/installMode';
import { SettingsCard } from '@/features/settings/SettingsCard';
import { GoalsForm } from '@/features/settings/GoalsForm';
import { LongTermGoalsForm } from '@/features/settings/LongTermGoalsForm';
import { AppearanceCard } from '@/features/settings/AppearanceCard';
import { ApiKeyCard } from '@/features/settings/ApiKeyCard';
import { ExportCard } from '@/features/settings/ExportCard';
import { ImportCard } from '@/features/settings/ImportCard';
import { ViewportDiagnostics } from '@/features/settings/ViewportDiagnostics';
import { FoodLibraryCard } from '@/features/settings/FoodLibraryCard';
import { SyncCard } from '@/features/settings/SyncCard';

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

/**
 * Settings screen.
 *
 * Every section is a <SettingsCard>, so the six panels share one heading
 * treatment and one frame instead of six hand-written variants. Order runs
 * from the settings that change often (goals) to the ones you touch once
 * (install, backup).
 *
 * Plan 01-03: Install card (D-12) — platform-aware copy + Android Install
 * button when beforeinstallprompt was captured, hidden when already installed.
 * Version line (D-10) — bottom-of-screen muted "v{version} (build {hash})", now
 * also the tap target that reveals ViewportDiagnostics.
 */
export function SettingsScreen() {
  const installed = isStandalone();
  const canInstall = isAndroid() && getDeferredInstallPrompt() !== null;

  return (
    <div className="px-4 pb-10 pt-3 lg:px-6 lg:pt-4">
      <h1 className="font-display text-[22px] font-semibold tracking-[-0.025em]">Settings</h1>

      <div className="mt-5 space-y-4 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-7 lg:space-y-0 lg:[&>*]:min-w-0">
        {!installed && (
          <SettingsCard
            title="Install VZN"
            icon={Smartphone}
            description={
              canInstall
                ? "Install VZN to your home screen so your data isn't cleared."
                : 'Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen.'
            }
          >
            {canInstall && (
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  void triggerInstallPrompt();
                }}
              >
                Install
              </Button>
            )}
          </SettingsCard>
        )}

        {/* Above the goals: it's the setting that decides whether every other
            setting and every log survives moving to another device. */}
        <SyncCard />

        <GoalsForm />

        <LongTermGoalsForm />

        <ApiKeyCard />

        {/* Sits beside the AI card because both are about getting food INTO the
            app. It isn't a setting, so it doesn't belong up with the goals —
            this screen is ordered by how often you change something. */}
        <SettingsCard
          title="Entry format"
          icon={Type}
          description="Every way you can type food into the box — weights, label numbers, servings and multipliers."
        >
          <Link
            to="/help"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent [@media(hover:hover)]:hover:underline"
          >
            Open the reference
            <ChevronRight size={14} aria-hidden />
          </Link>
        </SettingsCard>

        <AppearanceCard />

        <ExportCard />

        <ImportCard />

        {/* Spans the row: it's a list, and a list in a half-width column gets
            truncated names next to a short card stretched to match its height.
            Last because it's a maintenance surface — you come here to fix a
            wrong row, not to change a setting. */}
        <FoodLibraryCard className="lg:col-span-2" />
      </div>

      <ViewportDiagnostics />
    </div>
  );
}
