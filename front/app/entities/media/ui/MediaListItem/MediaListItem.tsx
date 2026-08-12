'use client';

import { useDraggable } from '@dnd-kit/react';
import type { MediaResponseDTO } from '@superplayer/contracts';
import type { ReactNode } from 'react';

import { formatDuration } from '@/app/entities/media/lib/poster';
import { MediaArtwork } from '@/app/entities/media/ui/MediaArtwork/MediaArtwork';

import styles from './MediaListItem.module.css';

type MediaListItemProps = {
  media: MediaResponseDTO;
  index: number;
  onPlay: (media: MediaResponseDTO) => void;
  isPlaying?: boolean;
  // Feature-specific pieces composed in by the caller, same slot pattern as
  // MediaCard — an entity has no business importing a feature directly.
  actionSlot?: ReactNode;
  menuSlot?: ReactNode;
};

export function MediaListItem({
  media,
  index,
  onPlay,
  isPlaying,
  actionSlot,
  menuSlot,
}: MediaListItemProps) {
  const isVideo = media.media_type === 'video';
  // `data` carries the full media object on the drag source so a drop
  // handler elsewhere (e.g. LibraryPage's onDragEnd) doesn't need a separate
  // lookup — event.operation.source.data is this same object.
  const { ref } = useDraggable({
    id: media.id,
    data: media,
  });
  return (
    <article className={styles.row} ref={ref} onClick={() => onPlay(media)}>
      <span className={styles.index}>{index}</span>
      <span className={styles.thumb}>
        <MediaArtwork mediaId={media.id} hasThumbnail={media.has_thumbnail} />
      </span>
      <div className={styles.info}>
        <p className={isPlaying ? styles.titlePlaying : styles.title}>{media.title}</p>
        {media.description && <p className={styles.description}>{media.description}</p>}
      </div>
      <span className={isVideo ? styles.typeVideo : styles.type}>
        {media.media_type.toUpperCase()}
      </span>
      <span className={styles.duration}>{formatDuration(media.duration_seconds)}</span>
      {actionSlot}
      {menuSlot}
    </article>
  );
}
