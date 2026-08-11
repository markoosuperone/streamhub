'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';
import { useRef, useState } from 'react';

import { formatDuration } from '@/app/entities/media/lib/poster';
import { MediaArtwork } from '@/app/entities/media/ui/MediaArtwork/MediaArtwork';
import { usePlayerStore } from '@/app/entities/player/model/usePlayerStore';
import { API } from '@/app/shared/api/endpoints';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';
import { PauseIcon } from '@/app/shared/ui/icons/PauseIcon';
import { PlayIcon } from '@/app/shared/ui/icons/PlayIcon';
import { SkipBackIcon } from '@/app/shared/ui/icons/SkipBackIcon';
import { SkipForwardIcon } from '@/app/shared/ui/icons/SkipForwardIcon';

import styles from './MediaPlayer.module.css';

type MediaPlayerProps = {
  media: MediaResponseDTO;
};

export function MediaPlayer({ media }: MediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration_seconds);
  const next = usePlayerStore((state) => state.next);
  const prev = usePlayerStore((state) => state.prev);
  const upPrev = usePlayerStore((state) => state.upPrev);
  const isVideo = media.media_type === 'video';
  const skipBackIsAvailable = upPrev.length > 0;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  const setMediaRef = (element: HTMLVideoElement | HTMLAudioElement | null) => {
    mediaRef.current = element;
  };

  const togglePlay = () => {
    const element = mediaRef.current;
    if (!element) return;
    if (element.paused) {
      void element.play();
    } else {
      element.pause();
    }
  };

  const handleSkipBack = () => {
    prev();
    const element = mediaRef.current;
    if (!element) return;
    element.currentTime = 0;
    void element.play();
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const element = mediaRef.current;
    const track = progressRef.current;
    if (!element || !track || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    element.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const mediaProps = {
    src: API.media.get(media.id),
    autoPlay: true,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onTimeUpdate: () => setCurrentTime(mediaRef.current?.currentTime ?? 0),
    onDurationChange: () => {
      const value = mediaRef.current?.duration;
      if (value && Number.isFinite(value)) {
        setDuration(value);
      }
    },
    onEnded: () => next(),
  };

  return (
    <div className={styles.player}>
      {isVideo ? (
        <video ref={setMediaRef} className={styles.video} onClick={togglePlay} {...mediaProps} />
      ) : (
        <>
          <div className={styles.artwork}>
            <MediaArtwork mediaId={media.id} hasThumbnail={media.has_thumbnail} />
          </div>
          <audio ref={setMediaRef} {...mediaProps} />
        </>
      )}

      <div className={styles.meta}>
        <p className={styles.trackTitle}>{media.title}</p>
        {media.description && <p className={styles.trackSubtitle}>{media.description}</p>}
      </div>

      <div ref={progressRef} className={styles.progress} onClick={handleSeek}>
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={styles.times}>
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>

      <div className={styles.controls}>
        <Button
          variant={BUTTON_VARIANTS.text}
          className={styles.skip}
          aria-label="Skip Back"
          onClick={handleSkipBack}
          disabled={!skipBackIsAvailable}
        >
          <SkipBackIcon />
        </Button>
        <Button
          className={styles.playToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
        >
          {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </Button>
        <Button
          variant={BUTTON_VARIANTS.text}
          className={styles.skip}
          aria-label="Next"
          onClick={next}
        >
          <SkipForwardIcon />
        </Button>
      </div>
    </div>
  );
}
