import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { TabBar } from './TabBar';
import { NAV_TABS } from './navTabs';
import { InstallBanner } from './InstallBanner';
import { EvictionBanner } from './EvictionBanner';
import { focusRing, press } from './ui/styles';

/**
 * AppShell — floating glass header + banner slot + route outlet + tab bar.
 * The <header> and TabBar's <nav> provide implicit landmark roles.
 *
 * Layout: the shell is one viewport tall (`h-dvh`, which tracks the iOS
 * toolbar) and clips; <main> is the only scroller and fills it completely.
 * The header and tab bar are absolutely positioned ON TOP of that scroller
 * rather than being flex siblings beside it — which is the whole point. Glass
 * blurs whatever is painted behind it, so if the bars sat next to the content
 * instead of over it there would be nothing to blur and the material would
 * collapse into a flat tint. <main> pays for the overlap with padding.
 *
 * `--shell-header` / `--shell-tabbar` are the single source of truth for how
 * tall the chrome is — the bars lay themselves out from them and <main> insets
 * itself by them, so the two can't drift apart. They're set as arbitrary
 * properties rather than inline styles specifically so `lg:` can override them.
 *
 * PHONE (< lg) IS FROZEN — every desktop change below is behind `lg:`:
 *   - content widens from max-w-md to max-w-6xl
 *   - navigation moves into the header, where a pointer already is, and the
 *     bottom tab bar (a thumb-reach affordance with no thumb) is dropped
 *   - the settings gear goes with it: it's a duplicate of a now-visible tab
 *   - `--shell-tabbar` collapses to a plain bottom margin, which is most of
 *     what made the desktop layout feel vertically boxed in
 *
 * Plan 01-03 mounts <InstallBanner /> and <EvictionBanner /> in the banner
 * slot above {children}. Both banners self-guard against rendering when their
 * trigger conditions are unmet (return null), so the wrapping container is
 * always present but visually empty when neither shows — hence `empty:hidden`,
 * which collapses its padding in the (usual) banner-less state.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="sky relative h-dvh overflow-hidden bg-bg text-text [--shell-header:60px] [--shell-tabbar:74px] lg:[--shell-header:76px] lg:[--shell-tabbar:32px]">
      {/* `scrollbar-gutter: stable both-edges` reserves the scrollbar's width
          on BOTH sides. Without it, <main>'s scrollbar eats width from the
          right only, so content centres in a box that is offset from the one
          the header centres in — the two drift apart by half a scrollbar and
          the whole page looks nudged left. Reserving symmetrically keeps both
          boxes concentric whether or not the scrollbar is showing. */}
      <main
        className="h-full overflow-x-hidden overflow-y-auto overscroll-contain"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        <div
          className="mx-auto w-full max-w-md lg:max-w-6xl"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + var(--shell-header))',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--shell-tabbar))',
          }}
        >
          <div className="px-4 pt-3 space-y-3 empty:hidden lg:px-6 lg:pt-4">
            <InstallBanner />
            <EvictionBanner />
          </div>
          {children}
        </div>
      </main>

      {/* Covers the strip above the header capsule, where content would
          otherwise be visible sliding past the top of the screen. Repaints the
          sky at viewport scale so it continues the shell's gradient exactly
          instead of laying a flat band across the top. */}
      <div
        aria-hidden
        className="sky pointer-events-none absolute inset-x-0 top-0 z-30"
        style={{ height: 'calc(env(safe-area-inset-top) + 8px)' }}
      />

      <header className="safe-area-top pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="mx-auto w-full max-w-md px-4 pt-2 lg:max-w-6xl lg:px-6 lg:pt-3">
          <div className="glass pointer-events-auto flex h-12 items-center justify-between rounded-full pl-5 pr-1.5 lg:h-14 lg:pl-7 lg:pr-3">
            <span className="font-display text-[16px] font-semibold tracking-[-0.02em] lg:text-[18px]">
              VZN
            </span>

            {/* Desktop navigation. Hidden on phones, where TabBar owns this. */}
            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {NAV_TABS.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        [
                          'flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px]',
                          'transition-colors duration-200 ease-out-soft',
                          focusRing,
                          isActive
                            ? 'bg-accent-wash font-semibold text-accent'
                            : 'font-medium text-muted [@media(hover:hover)]:hover:text-text',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={16} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                          <span aria-current={isActive ? 'page' : undefined}>{label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Phone-only shortcut — on desktop, Settings is a visible tab. */}
            <Link
              to="/settings"
              aria-label="Settings"
              className={`grid h-9 w-9 place-items-center rounded-full text-muted lg:hidden ${press} ${focusRing}`}
            >
              <SettingsIcon size={18} />
            </Link>
          </div>
        </div>
      </header>

      <TabBar />
    </div>
  );
}
