import { useEffect, useState } from 'react';
import { Banner } from './Banner';
import { isStandalone, triggerInstallPrompt } from '@/lib/installMode';
import { PREV_OPENED_KEY } from '@/lib/storageKeys';

const DISMISS_KEY = 'ht.evictionBannerDismissedAt';
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

/**
 * Eviction-warning banner (D-14 / UI-SPEC §"Eviction-warning banner").
 *
 * Trigger:
 *   !isStandalone()
 *   && prevOpenedAt exists (not first launch)
 *   && (now - prevOpenedAt) > 4 days
 *   && no dismissal within 7 days
 *
 * Copy is verbatim from UI-SPEC ("Your data may be at risk" / "You haven't opened
 * HealthTracker in several days. Install to home screen or export now to avoid
 * browser data loss.").
 *
 * a11y deviation from UI-SPEC: wrapped in role="alert" instead of role="banner".
 * Semantically this IS a live alert about imminent data loss — role="alert" matches
 * WAI-ARIA Authoring Practices and triggers screen-reader announcement on mount.
 * Also resolves the multi-landmark conflict with AppShell's implicit <header role="banner">.
 *
 * PREV_OPENED_KEY is imported from @/lib/storageKeys (NOT @/main) to keep the
 * import graph acyclic — main.tsx has module-load side effects (initApp() runs
 * on import → renders App → mounts EvictionBanner).
 */
export function EvictionBanner() {
  const [visible, setVisible] = useState(false);

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
    const prevRaw = localStorage.getItem(PREV_OPENED_KEY);
    const prev = prevRaw ? Number(prevRaw) : null;
    if (!prev) {
      // First launch — no prior timestamp to measure against.
      setVisible(false);
      return;
    }
    if (Date.now() - prev <= FOUR_DAYS_MS) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div role="alert">
      <Banner
        variant="warning"
        title={'Your data may be at risk'}
        body={
          "You haven't opened HealthTracker in several days. Install to home screen or export now to avoid browser data loss."
        }
        primaryAction={{
          label: 'Install',
          onClick: () => {
            void triggerInstallPrompt();
          },
        }}
        onDismiss={() => {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
          setVisible(false);
        }}
      />
    </div>
  );
}
