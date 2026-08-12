import type { ReactNode } from 'react';

import styles from './Brand.module.css';

type BrandProps = {
  logo: ReactNode;
  name: string;
};

export function Brand({ logo, name }: BrandProps) {
  return (
    <div className={styles.brand}>
      <span className={styles.logo}>{logo}</span>
      <span className={styles.name}>{name}</span>
    </div>
  );
}
