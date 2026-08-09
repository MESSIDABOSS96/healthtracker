// src/features/food/FoodThumb.tsx
// OPFS photo → object-URL lifecycle wrapper.
//
// Pitfall #3 / RESEARCH.md Pattern 6: URL.createObjectURL must NEVER appear inline
// in JSX — it allocates a blob URL every render and leaks memory unbounded. Always
// create in useEffect, store in state, and revoke in the cleanup.

import { useEffect, useState } from 'react';
import { loadPhoto } from '@/lib/photoStore';
import { cn } from '@/lib/utils';

interface FoodThumbProps {
  photoKey: string | undefined;
  size?: number;
  className?: string;
}

export function FoodThumb({ photoKey, size = 20, className }: FoodThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    if (!photoKey) {
      setUrl(null);
      return;
    }

    (async () => {
      try {
        const blob = await loadPhoto(photoKey);
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      } catch {
        // Missing/corrupt photo — silently degrade to placeholder.
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoKey]);

  if (!photoKey || !url) {
    return (
      <div
        className={cn('rounded-full bg-surface-2 border border-hairline', className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={url}
      alt=""
      className={cn('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}
