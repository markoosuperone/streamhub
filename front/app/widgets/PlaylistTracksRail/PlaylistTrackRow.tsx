'use client';

import { useSortable } from '@dnd-kit/react/sortable';
import type { PlaylistItemWithMediaResponseDTO } from '@superplayer/contracts';

import { formatDuration } from '@/app/entities/media/lib/poster';
import { MediaArtwork } from '@/app/entities/media/ui/MediaArtwork/MediaArtwork';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './PlaylistTracksRail.module.css';

// LibraryPage's handleDragEnd reads this to tell a track reorder apart from a
// media-to-playlist add (MediaListItem's plain useDraggable, no group) — both
// share the same DragDropProvider.
export const PLAYLIST_ITEM_SORTABLE_GROUP = 'playlist-items';

type PlaylistTrackRowProps = {
  item: PlaylistItemWithMediaResponseDTO;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
};

export function PlaylistTrackRow({
  item,
  index,
  isPlaying,
  onPlay,
  onRemove,
}: PlaylistTrackRowProps) {
  const { ref } = useSortable({
    id: item.id,
    index,
    group: PLAYLIST_ITEM_SORTABLE_GROUP,
    data: { kind: 'playlist-item', index, mediaId: item.media_id, playlistId: item.playlist_id },
  });

  return (
    <div ref={ref} className={styles.track} onClick={onPlay}>
      <span className={styles.thumb}>
        <MediaArtwork mediaId={item.media_id} hasThumbnail={item.media.has_thumbnail} />
      </span>
      <div className={styles.info}>
        <p className={isPlaying ? styles.trackTitlePlaying : styles.trackTitle}>
          {item.media.title}
        </p>
        <p className={styles.trackMeta}>
          {item.media.media_type.toUpperCase()} · {formatDuration(item.media.duration_seconds)}
        </p>
      </div>
      <Button
        variant={BUTTON_VARIANTS.icon}
        className={styles.remove}
        aria-label={`Remove ${item.media.title} from playlist`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        ✕
      </Button>
    </div>
  );
}
