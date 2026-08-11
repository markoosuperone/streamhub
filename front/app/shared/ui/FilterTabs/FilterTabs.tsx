'use client';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './FilterTabs.module.css';

type FilterTabsProps<T extends string> = {
  filters: T[];
  labels: Record<T, string>;
  filter: T;
  onFilterChange: (filter: T) => void;
};

export function FilterTabs<T extends string>({
  filters,
  labels,
  filter,
  onFilterChange,
}: FilterTabsProps<T>) {
  return (
    <div className={styles.filters}>
      {filters.map((value) => (
        <Button
          key={value}
          variant={filter === value ? BUTTON_VARIANTS.accent : BUTTON_VARIANTS.outline}
          className={styles.filterButton}
          onClick={() => onFilterChange(value)}
        >
          {labels[value]}
        </Button>
      ))}
    </div>
  );
}
