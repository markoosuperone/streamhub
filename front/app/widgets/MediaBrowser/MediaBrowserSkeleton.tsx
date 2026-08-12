import { Skeleton } from '@/app/shared/ui/Skeleton/Skeleton';

import styles from './MediaBrowser.module.css';
import skeleton from './MediaBrowserSkeleton.module.css';

// Card count is arbitrary — enough to fill a typical viewport without implying
// how much media actually exists.
const PLACEHOLDER_CARDS = Array.from({ length: 8 }, (_, index) => index);

// Mirrors MediaBrowser's own layout (same .browse/.header classes) so the real
// content lands in the same place the placeholder occupied, with no reflow.
export function MediaBrowserSkeleton() {
  return (
    <section className={styles.browse}>
      <div className={styles.header}>
        <Skeleton className={skeleton.heading} />
        <Skeleton className={skeleton.tabs} />
      </div>
      <div className={skeleton.grid}>
        {PLACEHOLDER_CARDS.map((index) => (
          <Skeleton key={index} className={skeleton.card} />
        ))}
      </div>
    </section>
  );
}
