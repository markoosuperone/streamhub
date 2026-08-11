'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CreatePlaylistModal } from '@/app/features/playlists/components/CreatePlaylistModal/CreatePlaylistModal';
import { PlaylistMenu } from '@/app/features/playlists/components/PlaylistMenu/PlaylistMenu';
import { usePlaylists } from '@/app/features/playlists/hooks/usePlaylists';
import { PLAYLIST_QUERY_PARAM } from '@/app/features/playlists/hooks/usePlaylistSelection';
import { ROUTES } from '@/app/shared/routes';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';
import { PlusIcon } from '@/app/shared/ui/icons/PlusIcon';

import styles from './PlaylistsRail.module.css';

export function PlaylistsRail() {
  const { playlists, createPlaylist, renamePlaylist, deletePlaylist } = usePlaylists();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <aside className={styles.rail}>
      <div className={styles.header}>
        <h2 className={styles.title}>PLAYLISTS</h2>
        <Button
          variant={BUTTON_VARIANTS.icon}
          className={styles.headerAdd}
          aria-label="New playlist"
          onClick={() => setModalOpen(true)}
        >
          <PlusIcon size={9} />
        </Button>
      </div>

      {playlists.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.proposal}>Start your first playlist.</p>
          <Button className={styles.emptyCreate} onClick={() => setModalOpen(true)}>
            <PlusIcon />
            New playlist
          </Button>
        </div>
      ) : (
        playlists.map((playlist) => (
          <div key={playlist.id} className={styles.row}>
            <Link
              href={`${ROUTES.home}?${PLAYLIST_QUERY_PARAM}=${playlist.id}`}
              className={styles.rowTitle}
            >
              {playlist.title}
            </Link>
            <PlaylistMenu playlist={playlist} onRename={renamePlaylist} onDelete={deletePlaylist} />
          </div>
        ))
      )}

      <p className={styles.hint}>Hit + on any card to add it to a playlist.</p>

      {modalOpen && (
        <CreatePlaylistModal onCreate={createPlaylist} onClose={() => setModalOpen(false)} />
      )}
    </aside>
  );
}
