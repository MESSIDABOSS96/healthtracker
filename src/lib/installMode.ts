// src/lib/installMode.ts
// Install-mode detection + Android beforeinstallprompt capture (D-11, D-13).
// Used by InstallBanner, EvictionBanner, and the Settings Install card.

type InstallPromptChoice = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: InstallPromptChoice; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Wire the Android beforeinstallprompt + appinstalled listeners.
 * Call once at app startup (from initApp), BEFORE any install button renders —
 * the listener has to be attached before Chrome fires the event during page load.
 */
export function wireBeforeInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

/**
 * True when running as an installed PWA (standalone mode).
 * Uses display-mode media query (modern browsers + iOS 17+) AND legacy
 * navigator.standalone for older iOS Safari.
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Returns the captured beforeinstallprompt event if available (Android only).
 * Used by banners + Settings card to decide whether to show an Install button.
 */
export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

/**
 * Trigger the Android install prompt. Returns 'unavailable' on iOS / when no
 * prompt was captured. After invocation the prompt is consumed and cannot be
 * re-triggered (Chrome platform constraint) — caller should re-render to hide
 * the Install button on 'accepted' / 'dismissed'.
 */
export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome;
}
