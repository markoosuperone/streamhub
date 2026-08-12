'use client';

import { ErrorFallback } from '@/app/shared/ui/ErrorFallback/ErrorFallback';

import styles from './error.module.css';

// Wraps page.tsx (Home/Library) and their nested layouts, but not this
// segment's own layout.tsx — TopBar and PlayerRail stay mounted and visible
// around this fallback. See Next's error.js nesting rule.
export default function MainError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className={styles.wrap}>
      <ErrorFallback error={error} onRetry={unstable_retry} />
    </div>
  );
}
