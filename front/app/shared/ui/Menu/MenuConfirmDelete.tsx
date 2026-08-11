'use client';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './MenuConfirmDelete.module.css';

type MenuConfirmDeleteProps = {
  label: string;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MenuConfirmDelete({
  label,
  submitting,
  error,
  onCancel,
  onConfirm,
}: MenuConfirmDeleteProps) {
  return (
    <div className={styles.confirm}>
      <p className={styles.text}>Delete &quot;{label}&quot;?</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button
          variant={BUTTON_VARIANTS.outline}
          className={styles.button}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant={BUTTON_VARIANTS.danger}
          className={styles.button}
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
