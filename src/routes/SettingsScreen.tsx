import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDeferredInstallPrompt, triggerInstallPrompt, isStandalone } from '@/lib/installMode';
import { APP_VERSION, BUILD_HASH } from '@/lib/version';
import { GoalsForm } from '@/features/settings/GoalsForm';

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

/**
 * Settings screen — Phase 1 (extends scaffold-shell stub).
 *
 * Plan 01-03 additions:
 *  - Install card (D-12) — platform-aware copy + Android Install button when
 *    beforeinstallprompt was captured. Hidden when already installed (standalone).
 *  - Version line (D-10) — bottom-of-screen muted "v{version} (build {hash})".
 *
 * Phase 2 will add daily target inputs (calories, protein, carbs, fat, steps)
 * between the Install card and the version line.
 */
export function SettingsScreen() {
  const installed = isStandalone();
  const canInstall = isAndroid() && getDeferredInstallPrompt() !== null;

  return (
    <div className="px-4 py-6 space-y-4 flex flex-col min-h-[calc(100dvh-112px)]">
      <h1 className="text-xl font-semibold">Settings</h1>

      {!installed && (
        <Card className="bg-surface border border-border rounded-lg p-4">
          <h2 className="text-base font-semibold text-text">{'Install HealthTracker'}</h2>
          <p className="text-sm text-muted mt-1">
            {canInstall
              ? "Install HealthTracker to your home screen so your data isn't cleared."
              : 'Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen.'}
          </p>
          {canInstall && (
            <div className="mt-3">
              <Button
                variant="default"
                onClick={() => {
                  void triggerInstallPrompt();
                }}
              >
                Install
              </Button>
            </div>
          )}
        </Card>
      )}

      <GoalsForm />

      <div className="flex-1" />

      <p className="text-xs text-muted text-center">
        v{APP_VERSION} (build {BUILD_HASH})
      </p>
    </div>
  );
}
