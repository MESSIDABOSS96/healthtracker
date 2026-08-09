import { NavLink } from 'react-router-dom';
import { NAV_TABS } from './navTabs';
import { focusRing } from './ui/styles';

/**
 * Floating glass tab bar — a capsule hovering over the scrolling content,
 * capped at the content width, rather than a bar welded to the bottom edge.
 *
 * The active tab is marked twice — a tinted pill filling its cell and the
 * accent color — because color alone is a weak signal on a 19px icon and no
 * signal at all to anyone who can't separate the two hues. The pill is a plain
 * background transition, not a thumb that slides between cells: this bar is
 * tapped dozens of times a day, and per the animation-frequency rule that's
 * squarely in "reduce or remove" territory.
 *
 * Phone only. A bottom bar exists because it's where a thumb already is; on a
 * desktop pointer that reasoning evaporates and it just eats vertical space,
 * so AppShell's header takes over the navigation at `lg`.
 */

export function TabBar() {
  return (
    <>
      {/* Covers the strip below the capsule, so content sliding off the bottom
          of the screen doesn't show in the gap. */}
      <div
        aria-hidden
        className="sky sky-edge-bottom pointer-events-none absolute inset-x-0 bottom-0 z-30 lg:hidden"
        style={{ height: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      />

      <nav
        aria-label="Primary"
        className="safe-area-bottom pointer-events-none absolute inset-x-0 bottom-0 z-40 lg:hidden"
      >
        <div className="mx-auto w-full max-w-md px-4 pb-2.5">
          <ul className="glass pointer-events-auto flex h-[58px] gap-1 rounded-full p-1.5">
            {NAV_TABS.map(({ to, label, Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  aria-label={label}
                  className={({ isActive }) =>
                    [
                      'flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full',
                      'transition-colors duration-200 ease-out-soft',
                      focusRing,
                      isActive ? 'bg-accent-wash text-accent' : 'text-muted',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                      <span
                        className={`text-[10.5px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
