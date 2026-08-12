'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';
import type { ReactNode } from 'react';

import { formatDuration } from '@/app/entities/media/lib/poster';
import { MediaArtwork } from '@/app/entities/media/ui/MediaArtwork/MediaArtwork';

import styles from './MediaCard.module.css';

type MediaCardProps = {
  media: MediaResponseDTO;
  onPlay: (media: MediaResponseDTO) => void;
  // Feature-specific pieces (delete menu, add-to-playlist) are composed in by
  // the caller rather than imported directly — an entity has no business
  // knowing about those features.
  cornerSlot?: ReactNode;
  actionSlot?: ReactNode;
};

export function MediaCard({ media, onPlay, cornerSlot, actionSlot }: MediaCardProps) {
  const isVideo = media.media_type === 'video';

  return (
    <article className={styles.card} onClick={() => onPlay(media)}>
      <div className={styles.poster}>
        <MediaArtwork mediaId={media.id} hasThumbnail={media.has_thumbnail} />
        {isVideo && (
          <span className={styles.playOverlay} aria-hidden>
            ▶
          </span>
        )}
        <span className={isVideo ? styles.badgeVideo : styles.badge}>
          {media.media_type.toUpperCase()}
        </span>
        <span className={styles.duration}>{formatDuration(media.duration_seconds)}</span>
        {cornerSlot}
      </div>
      <div className={styles.info}>
        <div className={styles.meta}>
          <p className={styles.title}>{media.title}</p>
          {media.description && <p className={styles.description}>{media.description}</p>}
        </div>
        {actionSlot}
      </div>
    </article>
  );
}
