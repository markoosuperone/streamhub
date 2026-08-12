'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';
import { useState } from 'react';

import { usePlaylistItemsStore } from '@/app/entities/playlist/model/usePlaylistItemsStore';
import { usePlaylists } from '@/app/features/playlists/hooks/usePlaylists';
import { ApiError } from '@/app/shared/api/api.error';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';
import { PlusIcon } from '@/app/shared/ui/icons/PlusIcon';
import { Modal } from '@/app/shared/ui/Modal/Modal';

import styles from './AddToPlaylistModal.module.css';

type AddToPlaylistModalProps = {
  media: MediaResponseDTO;
  onClose: () => void;
};

const FALLBACK_ERROR_MESSAGE = 'Could not add to playlist. Try again.';

export function AddToPlaylistModal({ media, onClose }: AddToPlaylistModalProps) {
  const { playlists, createPlaylist } = usePlaylists();
  const addItemToPlaylist = usePlaylistItemsStore((state) => state.addItemToPlaylist);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creatingSubmit, setCreatingSubmit] = useState(false);

  // usePlaylists() fetches independently here, so `playlists` starts empty
  // and fills in asynchronously — derive the form's visibility every render
  // instead of freezing it into creatingNew's initial state.
  const showCreateForm = creatingNew || playlists.length === 0;

  const addToPlaylist = async (playlistId: string) => {
    if (pendingId || addedIds.has(playlistId)) return;
    setPendingId(playlistId);
    setError(null);
    try {
      await addItemToPlaylist(playlistId, media);
      setAddedIds((current) => new Set(current).add(playlistId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  };

  const handleCreateAndAdd = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setCreatingSubmit(true);
    setError(null);
    try {
      const playlist = await createPlaylist(trimmed);
      setNewTitle('');
      setCreatingNew(false);
      await addToPlaylist(playlist.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE);
    } finally {
      setCreatingSubmit(false);
    }
  };

  return (
    <Modal title={`Add "${media.title}" to playlist`} onClose={onClose}>
      <div className={styles.body}>
        {playlists.length > 0 && (
          <ul className={styles.list}>
            {playlists.map((playlist) => {
              const isAdded = addedIds.has(playlist.id);
              const isPending = pendingId === playlist.id;
              const isRowDisabled = isAdded || isPending || Boolean(pendingId);
              return (
                <li key={playlist.id}>
                  <Button
                    variant={BUTTON_VARIANTS.ghost}
                    className={styles.row}
                    disabled={isRowDisabled}
                    onClick={() => addToPlaylist(playlist.id)}
                  >
                    <span className={styles.rowTitle}>{playlist.title}</span>
                    <span className={isAdded ? styles.statusAdded : styles.status}>
                      {isAdded ? 'Added ✓' : isPending ? 'Adding…' : <PlusIcon size={11} />}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {showCreateForm ? (
          <form className={styles.createForm} onSubmit={handleCreateAndAdd}>
            <input
              type="text"
              className={styles.createInput}
              placeholder="Playlist name…"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              disabled={creatingSubmit}
              autoFocus
            />
            <Button
              type="submit"
              className={styles.createSubmit}
              disabled={creatingSubmit || !newTitle.trim()}
            >
              {creatingSubmit ? 'Creating…' : 'Create & add'}
            </Button>
          </form>
        ) : (
          <Button
            variant={BUTTON_VARIANTS.outline}
            className={styles.newPlaylist}
            onClick={() => setCreatingNew(true)}
          >
            <PlusIcon size={11} />
            New playlist
          </Button>
        )}
      </div>
    </Modal>
  );
}
