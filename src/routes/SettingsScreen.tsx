import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDeferredInstallPrompt, triggerInstallPrompt, isStandalone } from '@/lib/installMode';
import { APP_VERSION, BUILD_HASH } from '@/lib/version';
import { SettingsCard } from '@/features/settings/SettingsCard';
import { GoalsForm } from '@/features/settings/GoalsForm';
import { LongTermGoalsForm } from '@/features/settings/LongTermGoalsForm';
import { AppearanceCard } from '@/features/settings/AppearanceCard';
import { ApiKeyCard } from '@/features/settings/ApiKeyCard';
import { ExportCard } from '@/features/settings/ExportCard';
import { ImportCard } from '@/features/settings/ImportCard';

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
 * Version line (D-10) — bottom-of-screen muted "v{version} (build {hash})".
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

        <GoalsForm />

        <LongTermGoalsForm />

        <ApiKeyCard />

        <AppearanceCard />

        <ExportCard />

        <ImportCard />
      </div>

      <p className="stat mt-8 text-center text-xs text-faint">
        v{APP_VERSION} · build {BUILD_HASH}
      </p>
    </div>
  );
}
