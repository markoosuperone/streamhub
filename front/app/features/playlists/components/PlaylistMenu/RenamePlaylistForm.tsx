'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './PlaylistMenu.module.css';

type RenamePlaylistFormProps = {
  initialTitle: string;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (title: string) => void;
};

export function RenamePlaylistForm({
  initialTitle,
  submitting,
  error,
  onCancel,
  onSubmit,
}: RenamePlaylistFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const trimmed = title.trim();
  const unchanged = trimmed === initialTitle;
  const inputRef = useRef<HTMLInputElement>(null);

  // Not a plain `autoFocus` — the menu panel is `position: fixed`, so a row
  // near the bottom of a long playlist list can open a panel that needs the
  // page to scroll for a plain autofocus to bring it into view. That scroll
  // is itself caught by Menu's close-on-scroll listener, closing the panel
  // (and this form with it) immediately after it opens. `preventScroll`
  // keeps the focus from ever triggering that scroll in the first place.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed || unchanged) return;
    onSubmit(trimmed);
  };

  return (
    <form className={styles.renameForm} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className={styles.renameInput}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={submitting}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button
          variant={BUTTON_VARIANTS.outline}
          className={styles.actionButton}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={styles.actionButton}
          disabled={submitting || !trimmed || unchanged}
        >
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
