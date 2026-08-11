'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';

import { MediaArtwork } from '@/app/entities/media/ui/MediaArtwork/MediaArtwork';
import { usePlayerStore } from '@/app/entities/player/model/usePlayerStore';
import { MediaPlayer } from '@/app/features/player/components/MediaPlayer/MediaPlayer';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './PlayerRail.module.css';

export function PlayerRail() {
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const upNext = usePlayerStore((state) => state.upNext);
  const playFromQueue = usePlayerStore((state) => state.playFromQueue);

  const handlePlay = (item: MediaResponseDTO) => {
    playFromQueue(item);
  };

  if (!nowPlaying) return null;

  return (
    <aside className={styles.rail}>
      <div className={styles.playerArea}>
        <h2 className={styles.title}>NOW PLAYING</h2>

        <MediaPlayer key={nowPlaying.id} media={nowPlaying} />
      </div>

      {upNext.length > 0 && (
        <div className={styles.upNext}>
          <h2 className={styles.title}>UP NEXT</h2>
          <ul className={styles.upNextList}>
            {upNext.map((item) => (
              <li key={item.id}>
                <Button
                  variant={BUTTON_VARIANTS.ghost}
                  className={styles.upNextItem}
                  onClick={() => handlePlay(item)}
                >
                  <span className={styles.upNextThumb}>
                    <MediaArtwork mediaId={item.id} hasThumbnail={item.has_thumbnail} />
                  </span>
                  <span className={styles.upNextTitle}>{item.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
