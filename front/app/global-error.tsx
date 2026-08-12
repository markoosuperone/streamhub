'use client';

import './globals.css';

import { Brand } from '@/app/shared/ui/Brand/Brand';
import { ErrorFallback } from '@/app/shared/ui/ErrorFallback/ErrorFallback';

import styles from './global-error.module.css';

// Replaces the root layout entirely when active, so it must define its own
// <html>/<body> and pull in global styles itself — metadata/generateMetadata
// aren't supported here since error boundaries must be Client Components.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className={styles.body}>
        <div className={styles.page}>
          <div className={styles.container}>
            <Brand logo="S" name="Super Player" />
            <ErrorFallback
              error={error}
              onRetry={unstable_retry}
              title="Super Player hit a snag"
              message="Something went wrong loading the app. Try again, or come back in a moment."
            />
          </div>
        </div>
      </body>
    </html>
  );
}
