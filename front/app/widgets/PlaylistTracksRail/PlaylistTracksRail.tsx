'use client';

import { useDroppable } from '@dnd-kit/react';
import type { MediaResponseDTO } from '@superplayer/contracts';
import { useEffect } from 'react';

import { usePlayerStore } from '@/app/entities/player/model/usePlayerStore';
import { usePlaylistsStore } from '@/app/entities/playlist/model/usePlaylistsStore';
import { usePlaylistItems } from '@/app/features/playlists/hooks/usePlaylistItems';

import { PlaylistTrackRow } from './PlaylistTrackRow';
import styles from './PlaylistTracksRail.module.css';

const EMPTY_MESSAGE = 'Empty — add tracks from the + button on any card.';
const NO_SELECTION_MESSAGE = 'Select a playlist above to see its tracks.';

type PlaylistTracksRailProps = {
  playlistId: string | null;
};

export function PlaylistTracksRail({ playlistId }: PlaylistTracksRailProps) {
  const playlist = usePlaylistsStore((state) =>
    playlistId ? state.playlists.find((item) => item.id === playlistId) : undefined,
  );
  const { items, removeItem } = usePlaylistItems(playlistId);
  const play = usePlayerStore((state) => state.play);
  const updateQueue = usePlayerStore((state) => state.updateQueue);
  const nowPlayingId = usePlayerStore((state) => state.nowPlaying?.id);

  // Called before any early return (rules of hooks) — id falls back to a
  // placeholder when nothing is selected, since useDroppable requires one,
  // but there's nothing meaningful to drop onto in that state anyway.
  const { ref, isDropTarget } = useDroppable({ id: playlistId ?? 'no-playlist-selected' });

  // The playlist itself becomes the queue, in position order — same shape as
  // LibraryBrowser handing the current page of media to play().
  const handlePlay = (media: MediaResponseDTO) => {
    play(
      media,
      items.map((item) => item.media),
    );
  };

  // Keeps the now-playing queue in sync with this playlist's tracks — if the
  // currently playing track is one of `items`, an add or reorder here (drag
  // or the add-to-playlist modal, both going through usePlaylistItemsStore)
  // would otherwise leave upNext/upPrev stale until the next play().
  useEffect(() => {
    if (!nowPlayingId) return;
    const isPlayingFromThisPlaylist = items.some((item) => item.media.id === nowPlayingId);
    if (!isPlayingFromThisPlaylist) return;
    updateQueue(items.map((item) => item.media));
  }, [items, nowPlayingId, updateQueue]);

  if (!playlist) {
    return (
      <aside className={styles.rail}>
        <p className={styles.placeholder}>{NO_SELECTION_MESSAGE}</p>
      </aside>
    );
  }

  const hasItems = items.length > 0;

  return (
    <aside className={isDropTarget ? styles.railDropTarget : styles.rail} ref={ref}>
      <div className={styles.header}>
        <h2 className={styles.name}>{playlist.title}</h2>
        <p className={styles.count}>{items.length} items</p>
      </div>

      {hasItems ? (
        <div className={styles.trackList}>
          {items.map((item, index) => (
            <PlaylistTrackRow
              key={item.id}
              item={item}
              index={index}
              isPlaying={item.media.id === nowPlayingId}
              onPlay={() => handlePlay(item.media)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{EMPTY_MESSAGE}</div>
      )}
    </aside>
  );
}
