// src/features/settings/SyncCard.tsx
// Sign in with Google, and an honest read on whether this device is current.
//
// The status line is the point of this card. Sync that silently stops is worse
// than no sync: the user keeps logging, believes both devices agree, and finds
// out weeks later. So the card always says which of four states it's in, and
// "N waiting to upload" is shown as a plain fact rather than an error — being
// offline in a gym is the normal case, not a fault.

import { CloudOff, Cloud, LogOut, RefreshCw, TriangleAlert } from 'lucide-react';
import { isSyncConfigured } from '@/lib/supabase';
import { signInWithGoogle, signOut } from '@/services/auth.svc';
import { syncNow } from '@/services/sync.svc';
import { releaseSync, useAccount, useSyncStatus } from '@/features/sync/useSync';
import { SettingsCard } from './SettingsCard';
import { Button } from '@/components/ui/button';
import { focusRing, press } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

function relativeTime(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function SyncCard({ className }: { className?: string }) {
  const account = useAccount();
  const status = useSyncStatus();

  // A build with no Supabase credentials is the original local-only app. Say
  // nothing rather than offering a button that can only fail.
  if (!isSyncConfigured()) return null;

  const handleSignOut = async () => {
    await signOut();
    releaseSync();
  };

  return (
    <SettingsCard
      title="Sync across devices"
      icon={account ? Cloud : CloudOff}
      description={
        account
          ? 'Your logs are kept in step on every device you sign in to, live.'
          : 'Sign in to keep your logs in step across your phone and computer. Without it, each device keeps its own separate history.'
      }
      className={className}
    >
      {!account ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={() => void signInWithGoogle()}
          >
            Continue with Google
          </Button>
          <p className="text-[12.5px] leading-relaxed text-faint">
            Your food, weight and check-ins sync. Your AI key never leaves this device.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-sm bg-surface-2 px-3 py-2.5">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-wash text-[13px] font-semibold text-accent">
                {(account.name ?? account.email ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              {account.name && (
                <span className="block truncate text-[13.5px] font-medium text-text">
                  {account.name}
                </span>
              )}
              <span className="block truncate text-[12px] text-muted">{account.email}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[12.5px]">
            {status.state === 'syncing' && (
              <>
                <RefreshCw size={13} className="animate-spin text-muted" aria-hidden />
                <span className="text-muted">Syncing…</span>
              </>
            )}
            {status.state === 'offline' && (
              <>
                <CloudOff size={13} className="text-muted" aria-hidden />
                <span className="text-muted">
                  Offline
                  {status.pendingCount > 0 && (
                    <> — <span className="stat">{status.pendingCount}</span> waiting to upload</>
                  )}
                </span>
              </>
            )}
            {status.state === 'error' && (
              <>
                <TriangleAlert size={13} className="text-warn" aria-hidden />
                <span className="text-warn">{status.message ?? 'Sync failed'}</span>
              </>
            )}
            {status.state === 'idle' && (
              <>
                <Cloud size={13} className="text-muted" aria-hidden />
                <span className="text-muted">
                  {status.pendingCount > 0 ? (
                    <>
                      <span className="stat">{status.pendingCount}</span> waiting to upload
                    </>
                  ) : status.lastSyncedAt ? (
                    `Up to date · ${relativeTime(status.lastSyncedAt)}`
                  ) : (
                    'Up to date'
                  )}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void syncNow(account.id)}
              disabled={status.state === 'syncing'}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5',
                'text-[13px] font-medium text-accent disabled:opacity-40',
                '[@media(hover:hover)]:hover:bg-accent-wash',
                press,
                'transition-[background-color,transform] duration-150 ease-out-soft',
                focusRing,
              )}
            >
              <RefreshCw size={13} aria-hidden /> Sync now
            </button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleSignOut()}>
              <LogOut size={13} aria-hidden /> Sign out
            </Button>
          </div>

          {/* Stated plainly because the opposite is the intuitive guess, and
              guessing wrong here means someone signs out expecting a clean
              slate and is surprised either way. */}
          <p className="text-[12px] leading-relaxed text-faint">
            Signing out leaves this device&apos;s data where it is — it stops syncing, nothing
            is deleted.
          </p>
        </div>
      )}
    </SettingsCard>
  );
}
