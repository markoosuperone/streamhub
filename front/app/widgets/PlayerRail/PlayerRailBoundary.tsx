'use client';

import { type ErrorInfo, unstable_catchError } from 'next/error';

import { ErrorFallback } from '@/app/shared/ui/ErrorFallback/ErrorFallback';

import styles from './PlayerRail.module.css';

// route-level error.tsx in (main)/ doesn't cover PlayerRail — it's rendered
// directly by (main)/layout.tsx, outside the route segment error.tsx wraps.
// MediaPlayer's imperative <audio>/<video> DOM work is the realistic crash
// risk here, so it gets its own boundary rather than taking down TopBar too.
function PlayerRailErrorFallback(_props: object, { error, unstable_retry }: ErrorInfo) {
  return (
    <aside className={styles.rail}>
      <ErrorFallback
        error={error}
        onRetry={unstable_retry}
        title="Player unavailable"
        message="Something went wrong loading the player."
      />
    </aside>
  );
}

export const PlayerRailBoundary = unstable_catchError(PlayerRailErrorFallback);
