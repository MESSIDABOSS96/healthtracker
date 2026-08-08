import { NavLink } from 'react-router-dom';
import { CircleDot, ChartLine, Settings } from 'lucide-react';

/**
 * Bottom tab bar. 3 equal-width tabs.
 * Active tab uses --accent; inactive uses --muted.
 */
const tabs = [
  { to: '/daily',     label: 'Daily',     Icon: CircleDot },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartLine },
  { to: '/settings',  label: 'Settings',  Icon: Settings },
];

export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="safe-area-bottom sticky bottom-0 z-40 bg-surface border-t border-border"
    >
      <ul className="flex h-14">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 h-full w-full',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive ? 'text-accent' : 'text-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  <span className="text-xs" aria-current={isActive ? 'page' : undefined}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
