---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-21T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Test

[awaiting human testing — phase 01 closed with these items deferred to a future on-device session]

## Tests

### 1. iOS Safari — Add to Home Screen → offline launch
expected: Open LAN preview URL in iOS Safari. Tap Share → Add to Home Screen. Confirm icon appears on home screen. Kill Safari, enable Airplane Mode, tap icon. App must launch in standalone mode and render the dark shell (header, 4 Today cards, bottom tab bar) with no network.
result: [pending]

### 2. Android Chrome — beforeinstallprompt → install → offline launch
expected: Open LAN preview URL in Android Chrome. Confirm InstallBanner's primary "Install" button appears (beforeinstallprompt fired). Tap Install. Confirm standalone mode launches. Enable Airplane Mode, re-launch from home-screen icon. App must render offline.
result: [pending]

### 3. Warm-cache first-contentful-paint <1s on modern iPhone
expected: After install + one warm launch, relaunching from home-screen icon should show the dark shell (header + 4 Today cards + bottom tab bar) in under 1 second. Measure via Safari Web Inspector or DevTools Performance panel: domContentLoadedEventEnd < 1000ms from navigation start, or Lighthouse FCP < 1500ms against preview URL.
result: [pending]

### 4. Eviction banner DevTools simulation
expected: In DevTools console run `localStorage.setItem('healthtracker:prevOpenedAt', String(Date.now() - 5*24*60*60*1000)); location.reload();`. Confirm the "Your data may be at risk" banner appears. Click the X — banner dismisses. Reload — banner does not re-appear (7-day window active).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
