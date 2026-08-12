'use client';

import { Suspense } from 'react';

import { MediaBrowser } from '@/app/widgets/MediaBrowser/MediaBrowser';
import { MediaBrowserSkeleton } from '@/app/widgets/MediaBrowser/MediaBrowserSkeleton';
import { PlaylistsRail } from '@/app/widgets/PlaylistsRail/PlaylistsRail';

import styles from './HomePage.module.css';

// The boundary is required, not decorative: MediaBrowser reads useSearchParams,
// and without it the production build fails to prerender this route. It wraps
// only MediaBrowser so PlaylistsRail — which reads no search params — still
// makes it into the static HTML.
export function HomePage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={<MediaBrowserSkeleton />}>
        <MediaBrowser />
      </Suspense>
      <PlaylistsRail />
    </div>
  );
}
