'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';

import { MEDIA_FILTER_LABELS, MEDIA_FILTERS } from '@/app/entities/media/lib/filter';
import { MediaCard } from '@/app/entities/media/ui/MediaCard/MediaCard';
import { usePlayerStore } from '@/app/entities/player/model/usePlayerStore';
import { useUser } from '@/app/entities/user/model/UserContext';
import { MediaCardMenu } from '@/app/features/media/components/MediaCardMenu/MediaCardMenu';
import { useMediaFilter } from '@/app/features/media/hooks/useMediaFilter';
import { MEDIA_STATUS, useMediaListQuery } from '@/app/features/media/hooks/useMediaListQuery';
import { useMediaSearchQuery } from '@/app/features/media/hooks/useMediaSearchQuery';
import { AddToPlaylistButton } from '@/app/features/playlists/components/AddToPlaylistButton/AddToPlaylistButton';
import { usePlaylists } from '@/app/features/playlists/hooks/usePlaylists';
import { useSelectedPlaylistId } from '@/app/features/playlists/hooks/usePlaylistSelection';
import { ErrorFallback } from '@/app/shared/ui/ErrorFallback/ErrorFallback';
import { FilterTabs } from '@/app/shared/ui/FilterTabs/FilterTabs';
import { Grid } from '@/app/shared/ui/Grid/Grid';
import { Heading } from '@/app/shared/ui/Heading/Heading';
import { Pagination } from '@/app/shared/ui/Pagination/Pagination';

import styles from './MediaBrowser.module.css';

const EMPTY_MESSAGE = 'Nothing here yet — upload something to get started.';

export function MediaBrowser() {
  const { debouncedQuery } = useMediaSearchQuery();
  const { filter, setFilter } = useMediaFilter();
  const { user } = useUser();
  const selectedPlaylistId = useSelectedPlaylistId();
  const { playlists } = usePlaylists();
  const selectedPlaylist = selectedPlaylistId
    ? (playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null)
    : null;
  const play = usePlayerStore((state) => state.play);
  const clearIfPlaying = usePlayerStore((state) => state.clearIfPlaying);
  const { media, page, totalPages, setPage, removeMedia, status, retry } = useMediaListQuery({
    filter,
    search: debouncedQuery,
    selectedPlaylistId,
  });

  const handleDelete = (mediaId: string) => {
    removeMedia(mediaId);
    clearIfPlaying(mediaId);
  };

  const handlePlay = (item: MediaResponseDTO) => {
    play(item, media);
  };

  const renderItem = (item: MediaResponseDTO) => {
    // Delete is ownership-scoped on the backend (the media library itself is
    // shared/unscoped for reads) — only offer the menu on media the caller
    // actually owns, so it isn't offered just to fail with "not found".
    const isOwner = user?.user_id === item.owner_id;

    return (
      <MediaCard
        key={item.id}
        media={item}
        onPlay={handlePlay}
        cornerSlot={isOwner && <MediaCardMenu media={item} onDeleted={handleDelete} />}
        actionSlot={<AddToPlaylistButton media={item} />}
      />
    );
  };

  return (
    <section className={styles.browse}>
      <div className={styles.header}>
        <Heading>{selectedPlaylist ? selectedPlaylist.title : 'Browse everything'}</Heading>
        <FilterTabs
          filters={MEDIA_FILTERS}
          labels={MEDIA_FILTER_LABELS}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>
      {status === MEDIA_STATUS.error ? (
        // Not the empty-state message: an empty `media` here means the request
        // failed, and telling the user to upload something would be a lie.
        <ErrorFallback
          error={new Error('Media list request failed')}
          onRetry={retry}
          title="Could not load media"
          message="The library could not be reached. Check your connection and try again."
        />
      ) : (
        <>
          <Grid items={media} renderItem={renderItem} emptyMessage={EMPTY_MESSAGE} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
