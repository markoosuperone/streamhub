'use client';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './PlaylistMenu.module.css';

type PlaylistMenuListProps = {
  onRename: () => void;
  onDelete: () => void;
};

export function PlaylistMenuList({ onRename, onDelete }: PlaylistMenuListProps) {
  return (
    <>
      <Button variant={BUTTON_VARIANTS.ghost} className={styles.item} onClick={onRename}>
        Rename
      </Button>
      <Button variant={BUTTON_VARIANTS.text} className={styles.deleteItem} onClick={onDelete}>
        Delete
      </Button>
    </>
  );
}
