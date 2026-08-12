'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';
import { useState } from 'react';

import { AddToPlaylistModal } from '@/app/features/playlists/components/AddToPlaylistModal/AddToPlaylistModal';
import { Button } from '@/app/shared/ui/Button/Button';
import { PlusIcon } from '@/app/shared/ui/icons/PlusIcon';

import styles from './AddToPlaylistButton.module.css';

type AddToPlaylistButtonProps = {
  media: MediaResponseDTO;
};

export function AddToPlaylistButton({ media }: AddToPlaylistButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        className={styles.addButton}
        aria-label="Add to playlist"
        onClick={(event) => {
          event.stopPropagation();
          setModalOpen(true);
        }}
      >
        <PlusIcon />
      </Button>

      {modalOpen && <AddToPlaylistModal media={media} onClose={() => setModalOpen(false)} />}
    </>
  );
}
