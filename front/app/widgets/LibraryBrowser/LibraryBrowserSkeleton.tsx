import { Skeleton } from '@/app/shared/ui/Skeleton/Skeleton';

import styles from './LibraryBrowser.module.css';
import skeleton from './LibraryBrowserSkeleton.module.css';

const PLACEHOLDER_PLAYLISTS = Array.from({ length: 4 }, (_, index) => index);
const PLACEHOLDER_ROWS = Array.from({ length: 7 }, (_, index) => index);

// Mirrors LibraryBrowser's layout: the playlists strip on top, then the media
// list. Reuses that widget's own classes so nothing shifts on swap-in.
export function LibraryBrowserSkeleton() {
  return (
    <section className={styles.browse}>
      <div className={styles.playlistsSection}>
        <Skeleton className={skeleton.sectionTitle} />
        <div className={skeleton.playlistRow}>
          {PLACEHOLDER_PLAYLISTS.map((index) => (
            <Skeleton key={index} className={skeleton.playlistChip} />
          ))}
        </div>
      </div>

      <div className={styles.header}>
        <Skeleton className={skeleton.heading} />
        <Skeleton className={skeleton.tabs} />
      </div>

      <div className={skeleton.list}>
        {PLACEHOLDER_ROWS.map((index) => (
          <Skeleton key={index} className={skeleton.row} />
        ))}
      </div>
    </section>
  );
}
