'use client';

import { Brand } from '@/app/shared/ui/Brand/Brand';
import { ErrorFallback } from '@/app/shared/ui/ErrorFallback/ErrorFallback';

import styles from './error.module.css';

// The auth route has no TopBar/shell of its own, so this fallback carries the
// brand mark itself — same treatment as AuthPage and NotFoundPage.
export default function AuthError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Brand logo="S" name="Super Player" />
        <ErrorFallback error={error} onRetry={unstable_retry} />
      </div>
    </div>
  );
}
