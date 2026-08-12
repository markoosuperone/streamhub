'use client';

import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { useState } from 'react';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';
import { Modal } from '@/app/shared/ui/Modal/Modal';

import styles from './CreatePlaylistModal.module.css';

type CreatePlaylistModalProps = {
  onCreate: (title: string) => Promise<PlaylistResponseDTO>;
  onClose: () => void;
};

export function CreatePlaylistModal({ onCreate, onClose }: CreatePlaylistModalProps) {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch {
      setCreating(false);
    }
  };

  return (
    <Modal title="New playlist" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="Playlist name…"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={creating}
          autoFocus
        />
        <div className={styles.actions}>
          <Button
            variant={BUTTON_VARIANTS.outline}
            className={styles.cancel}
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button type="submit" className={styles.submit} disabled={creating || !title.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
