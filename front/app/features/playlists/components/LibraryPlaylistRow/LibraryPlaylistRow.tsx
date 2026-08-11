'use client';

import type { PlaylistResponseDTO } from '@superplayer/contracts';

import { PlaylistMenu } from '@/app/features/playlists/components/PlaylistMenu/PlaylistMenu';

import styles from './LibraryPlaylistRow.module.css';

type LibraryPlaylistRowProps = {
  playlist: PlaylistResponseDTO;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function LibraryPlaylistRow({
  playlist,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: LibraryPlaylistRowProps) {
  return (
    <div
      className={isSelected ? styles.playlistRowSelected : styles.playlistRow}
      onClick={() => onSelect(playlist.id)}
    >
      <span className={isSelected ? styles.playlistNameSelected : styles.playlistName}>
        {playlist.title}
      </span>
      <span className={styles.playlistCount}>{playlist.total_items} items</span>
      <PlaylistMenu playlist={playlist} onRename={onRename} onDelete={onDelete} />
    </div>
  );
}
