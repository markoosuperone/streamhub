import Link from 'next/link';

import { ROUTES } from '@/app/shared/routes';
import { Brand } from '@/app/shared/ui/Brand/Brand';
import { Heading } from '@/app/shared/ui/Heading/Heading';

import styles from './NotFoundPage.module.css';

const TITLE = 'Page not found';
const SUBTITLE = 'The page you were looking for has been moved, removed, or never existed.';

// Rendered outside the (main) route group, so there is no TopBar to navigate
// with — the link back home is the only way out and has to be part of the page.
export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Brand logo="S" name="Super Player" />

        <p className={styles.code}>404</p>

        <div className={styles.text}>
          <Heading>{TITLE}</Heading>
          <p className={styles.subtitle}>{SUBTITLE}</p>
        </div>

        <Link className={styles.action} href={ROUTES.home}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
