'use client';

import Image from 'next/image';
import { useState } from 'react';

import { gradientFor } from '@/app/entities/media/lib/poster';
import { API } from '@/app/shared/api/endpoints';

import styles from './MediaArtwork.module.css';

type MediaArtworkProps = {
  mediaId: string;
  hasThumbnail: boolean;
};

// Fills its parent with the media's thumbnail (frame grab / embedded cover
// art), falling back to the track's deterministic gradient when there is none.
//
// `hasThumbnail` comes from the record, so a grid of items known to have no
// artwork renders straight to the gradient instead of firing one doomed request
// per card. `onError` still guards the case where the flag and the stored file
// disagree, which turns a mismatch into the same graceful fallback.
export function MediaArtwork({ mediaId, hasThumbnail }: MediaArtworkProps) {
  const [hasArtwork, setHasArtwork] = useState(hasThumbnail);

  return (
    <div
      className={styles.artwork}
      style={hasArtwork ? undefined : { backgroundImage: gradientFor(mediaId) }}
    >
      {hasArtwork && (
        <Image
          className={styles.image}
          src={API.media.thumbnail(mediaId)}
          alt=""
          fill
          // The thumbnail route is auth-gated (reads the session cookie) —
          // Next's built-in optimizer fetches server-side without forwarding
          // the browser's cookies, which would break every thumbnail.
          unoptimized
          onError={() => setHasArtwork(false)}
        />
      )}
    </div>
  );
}
