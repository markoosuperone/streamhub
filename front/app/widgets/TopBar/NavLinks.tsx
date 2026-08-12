'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import buttonStyles from '@/app/shared/ui/Button/Button.module.css';

import { NAV_ITEMS } from './constant';
import styles from './TopBar.module.css';

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? buttonStyles.highlight : buttonStyles.ghost}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
