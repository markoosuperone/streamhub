import type { ReactNode } from 'react';

import styles from './Grid.module.css';

type GridProps<T> = {
  items: T[];
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
};

export function Grid<T>({ items, renderItem, emptyMessage }: GridProps<T>) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return <div className={styles.grid}>{items.map(renderItem)}</div>;
}
