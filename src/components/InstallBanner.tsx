import { useEffect, useState } from 'react';
import { Banner } from './Banner';
import { isStandalone, getDeferredInstallPrompt, triggerInstallPrompt } from '@/lib/installMode';

// Per-banner dismissal key — separate from the shared INSTALL_DISMISSED_KEY in
// storageKeys.ts. The Install banner uses its own 14-day timestamp; the
// Eviction banner uses a 7-day timestamp under its own key.
const DISMISS_KEY = 'ht.installBannerDismissedAt';
const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

/**
 * Install banner (D-11 / D-13 / UI-SPEC §"Install banner").
 *
 * Trigger: !isStandalone() && (no recent dismissal within 14 days)
 * Copy is data-safety framed (UI-SPEC verbatim "Install to protect your data"
 * + iOS share-sheet vs Android beforeinstallprompt body).
 *
 * a11y deviation from UI-SPEC: wrapped in role="region" + aria-label="Install prompt"
 * instead of role="banner" — the AppShell <header> already implicitly has the
 * "banner" landmark, and WAI-ARIA forbids multiple banner landmarks per document.
 */
export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isStandalone()) {
      setVisible(false);
      return;
    }
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    if (dismissed && Date.now() - dismissed < DISMISS_WINDOW_MS) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [tick]);

  // Re-check when beforeinstallprompt fires (Android) — retriggers render
  // so the platform-aware copy + Install button update.
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const android = isAndroid() && getDeferredInstallPrompt() !== null;
  // UI-SPEC §"Copywriting Contract" — verbatim strings.
  const body = android
    ? 'Add VZN to your home screen.'
    : 'Tap Share → Add to Home Screen to keep your logs safe.';

  return (
    <section role="region" aria-label="Install prompt">
      <Banner
        title={'Install to protect your data'}
        body={body}
        primaryAction={
          android
            ? {
                label: 'Install',
                onClick: () => {
                  void triggerInstallPrompt();
                },
              }
            : undefined
        }
        onDismiss={() => {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
          setVisible(false);
        }}
      />
    </section>
  );
}
