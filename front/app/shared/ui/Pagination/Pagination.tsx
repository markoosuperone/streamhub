'use client';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './Pagination.module.css';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <Button
        variant={BUTTON_VARIANTS.outline}
        className={styles.navButton}
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        ‹
      </Button>
      <span className={styles.status}>
        Page {page} of {totalPages}
      </span>
      <Button
        variant={BUTTON_VARIANTS.outline}
        className={styles.navButton}
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        ›
      </Button>
    </div>
  );
}
