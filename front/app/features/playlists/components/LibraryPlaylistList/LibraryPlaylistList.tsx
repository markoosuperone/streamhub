'use client';

import type { PlaylistResponseDTO } from '@superplayer/contracts';

import { LibraryPlaylistRow } from '@/app/features/playlists/components/LibraryPlaylistRow/LibraryPlaylistRow';

import styles from './LibraryPlaylistList.module.css';

type LibraryPlaylistListProps = {
  playlists: PlaylistResponseDTO[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function LibraryPlaylistList({
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onRename,
  onDelete,
}: LibraryPlaylistListProps) {
  return (
    <div className={styles.playlistList}>
      {playlists.map((playlist) => (
        <LibraryPlaylistRow
          key={playlist.id}
          playlist={playlist}
          isSelected={playlist.id === selectedPlaylistId}
          onSelect={onSelectPlaylist}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
