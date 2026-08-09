// src/components/navTabs.ts
// The three top-level destinations, shared by the phone tab bar and the
// desktop header nav so the two can't drift out of sync.

import { CircleDot, ChartLine, Settings, type LucideIcon } from 'lucide-react';

export interface NavTab {
  to: string;
  label: string;
  Icon: LucideIcon;
}

export const NAV_TABS: NavTab[] = [
  { to: '/daily', label: 'Daily', Icon: CircleDot },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartLine },
  { to: '/settings', label: 'Settings', Icon: Settings },
];
