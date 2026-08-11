'use client';

import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { useState } from 'react';

import { PlaylistMenuList } from '@/app/features/playlists/components/PlaylistMenu/PlaylistMenuList';
import { RenamePlaylistForm } from '@/app/features/playlists/components/PlaylistMenu/RenamePlaylistForm';
import { ApiError } from '@/app/shared/api/api.error';
import { MoreIcon } from '@/app/shared/ui/icons/MoreIcon';
import { Menu } from '@/app/shared/ui/Menu/Menu';
import { MenuConfirmDelete } from '@/app/shared/ui/Menu/MenuConfirmDelete';

import styles from './PlaylistMenu.module.css';

type PlaylistMenuProps = {
  playlist: PlaylistResponseDTO;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type View = 'menu' | 'rename' | 'delete';

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Try again.';

export function PlaylistMenu({ playlist, onRename, onDelete }: PlaylistMenuProps) {
  const [view, setView] = useState<View>('menu');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setView('menu');
    setError(null);
  };

  const handleRename = async (title: string, close: () => void) => {
    setSubmitting(true);
    setError(null);
    try {
      await onRename(playlist.id, title);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE);
      setSubmitting(false);
    }
  };

  const handleDelete = async (close: () => void) => {
    setSubmitting(true);
    setError(null);
    try {
      await onDelete(playlist.id);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE);
      setSubmitting(false);
    }
  };

  return (
    <Menu
      trigger={<MoreIcon />}
      triggerLabel="More options"
      triggerVariant="icon"
      triggerClassName={styles.trigger}
      onClose={reset}
    >
      {(close) => {
        if (view === 'rename') {
          return (
            <RenamePlaylistForm
              initialTitle={playlist.title}
              submitting={submitting}
              error={error}
              onCancel={() => setView('menu')}
              onSubmit={(title) => handleRename(title, close)}
            />
          );
        }

        if (view === 'delete') {
          return (
            <MenuConfirmDelete
              label={playlist.title}
              submitting={submitting}
              error={error}
              onCancel={() => setView('menu')}
              onConfirm={() => handleDelete(close)}
            />
          );
        }

        return (
          <PlaylistMenuList onRename={() => setView('rename')} onDelete={() => setView('delete')} />
        );
      }}
    </Menu>
  );
}
