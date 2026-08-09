// src/features/settings/ViewportDiagnostics.tsx
// What the device actually reports, rather than what a screenshot implies.
//
// This exists because four rounds of layout fixes were argued from sampled
// pixels — which established that the viewport was short but never why, and
// couldn't distinguish "the fix is wrong" from "the fix never ran". The one
// number that settles it is `screen` vs `viewport`: equal means the web view
// owns the screen and any gap is ours to fix in CSS; short means iOS handed us
// less than the screen and no stylesheet can reach past it.
//
// Hidden behind a tap on the version line — it's a diagnostic, not a setting.

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { APP_VERSION, BUILD_HASH } from '@/lib/version';
import { focusRing, press } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

/**
 * Resolve a CSS length by measuring it, since there is no way to read the
 * computed value of `100dvh` or `env(safe-area-inset-bottom)` directly. The
 * probe is out of flow and invisible, so it can't disturb the page it measures.
 */
function measure(height: string): number {
  const el = document.createElement('div');
  el.style.cssText =
    `position:absolute;top:0;left:0;width:0;visibility:hidden;` +
    `pointer-events:none;height:${height}`;
  document.body.appendChild(el);
  const h = el.getBoundingClientRect().height;
  el.remove();
  return Math.round(h);
}

interface Row {
  label: string;
  value: string;
}

function collect(): Row[] {
  const screenH = window.screen?.height ?? 0;
  const viewportH = window.innerHeight;
  const nav = window.navigator as Navigator & { standalone?: boolean };

  return [
    { label: 'build', value: `v${APP_VERSION} · ${BUILD_HASH}` },
    { label: 'screen', value: `${window.screen?.width ?? 0} × ${screenH}` },
    { label: 'viewport', value: `${window.innerWidth} × ${viewportH}` },
    // The headline. Anything but 0 is space the app was never given.
    { label: 'missing', value: `${screenH - viewportH}` },
    {
      label: 'visual vp',
      value: window.visualViewport ? String(Math.round(window.visualViewport.height)) : '—',
    },
    { label: 'dvh / svh / lvh', value: `${measure('100dvh')} / ${measure('100svh')} / ${measure('100lvh')}` },
    {
      label: 'safe top / bottom',
      value: `${measure('env(safe-area-inset-top)')} / ${measure('env(safe-area-inset-bottom)')}`,
    },
    { label: 'navigator.standalone', value: String(nav.standalone ?? '—') },
    {
      label: 'display-mode',
      value: String(window.matchMedia('(display-mode: standalone)').matches),
    },
    { label: '.standalone class', value: String(document.documentElement.classList.contains('standalone')) },
    { label: 'dpr', value: String(window.devicePixelRatio) },
  ];
}

export function ViewportDiagnostics() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!rows) return;
    try {
      await navigator.clipboard.writeText(rows.map(r => `${r.label}: ${r.value}`).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the values are on screen to read off anyway */
    }
  };

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setRows(rows ? null : collect())}
        className={cn(
          'stat mx-auto block rounded-sm px-3 py-1 text-center text-xs text-faint',
          press,
          'transition-colors duration-150 ease-out-soft',
          focusRing,
        )}
      >
        v{APP_VERSION} · build {BUILD_HASH}
      </button>

      {rows && (
        <div className="mx-auto mt-3 max-w-sm rounded-lg border border-hairline bg-surface-2 p-3">
          <dl className="space-y-1">
            {rows.map(r => (
              <div key={r.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[11.5px] text-muted">{r.label}</dt>
                <dd className="stat text-[11.5px] text-text">{r.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-1.5 rounded-sm py-1.5',
              'text-[12px] font-medium text-accent',
              press,
              'transition-colors duration-150 ease-out-soft',
              focusRing,
            )}
          >
            {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
