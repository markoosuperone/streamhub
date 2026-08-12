'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';

import { MEDIA_FILTER_LABELS, MEDIA_FILTERS } from '@/app/entities/media/lib/filter';
import { MediaListItem } from '@/app/entities/media/ui/MediaListItem/MediaListItem';
import { usePlayerStore } from '@/app/entities/player/model/usePlayerStore';
import { useUser } from '@/app/entities/user/model/UserContext';
import {
  MEDIA_CARD_MENU_LAYOUTS,
  MediaCardMenu,
} from '@/app/features/media/components/MediaCardMenu/MediaCardMenu';
import { useMediaFilter } from '@/app/features/media/hooks/useMediaFilter';
import {
  MEDIA_ITEMS_PER_PAGE,
  MEDIA_STATUS,
  useMediaListQuery,
} from '@/app/features/media/hooks/useMediaListQuery';
import { useMediaSearchQuery } from '@/app/features/media/hooks/useMediaSearchQuery';
import { AddToPlaylistButton } from '@/app/features/playlists/components/AddToPlaylistButton/AddToPlaylistButton';
import { LibraryPlaylistList } from '@/app/features/playlists/components/LibraryPlaylistList/LibraryPlaylistList';
import { usePlaylists } from '@/app/features/playlists/hooks/usePlaylists';
import { ErrorFallback } from '@/app/shared/ui/ErrorFallback/ErrorFallback';
import { FilterTabs } from '@/app/shared/ui/FilterTabs/FilterTabs';
import { Heading } from '@/app/shared/ui/Heading/Heading';
import { Pagination } from '@/app/shared/ui/Pagination/Pagination';

import styles from './LibraryBrowser.module.css';

const EMPTY_MESSAGE = 'Nothing here yet — upload something to get started.';
const EMPTY_PLAYLISTS_MESSAGE = 'No playlists yet — hit + on any track to create one.';

type LibraryBrowserProps = {
  selectedPlaylistId: string | null;
  onSelectPlaylist: (id: string) => void;
};

export function LibraryBrowser({ selectedPlaylistId, onSelectPlaylist }: LibraryBrowserProps) {
  const { playlists, renamePlaylist, deletePlaylist } = usePlaylists();

  const { debouncedQuery } = useMediaSearchQuery();
  const { filter, setFilter } = useMediaFilter();
  const { user } = useUser();

  const play = usePlayerStore((state) => state.play);
  const nowPlayingId = usePlayerStore((state) => state.nowPlaying?.id);
  const clearIfPlaying = usePlayerStore((state) => state.clearIfPlaying);
  const { media, page, totalPages, setPage, removeMedia, status, retry } = useMediaListQuery({
    filter,
    search: debouncedQuery,
  });

  const hasPlaylists = playlists.length > 0;
  const hasMedia = media.length > 0;

  const handleDelete = (mediaId: string) => {
    removeMedia(mediaId);
    clearIfPlaying(mediaId);
  };

  const handlePlay = (item: MediaResponseDTO) => {
    play(item, media);
  };

  const renderItem = (item: MediaResponseDTO, index: number) => {
    // Delete is ownership-scoped on the backend (the media library itself is
    // shared/unscoped for reads) — only offer the menu on media the caller
    // actually owns, matching MediaBrowser's rule.
    const isOwner = user?.user_id === item.owner_id;

    return (
      <MediaListItem
        key={item.id}
        media={item}
        index={(page - 1) * MEDIA_ITEMS_PER_PAGE + index + 1}
        onPlay={handlePlay}
        isPlaying={item.id === nowPlayingId}
        actionSlot={<AddToPlaylistButton media={item} />}
        menuSlot={
          isOwner && (
            <MediaCardMenu
              media={item}
              onDeleted={handleDelete}
              layout={MEDIA_CARD_MENU_LAYOUTS.row}
            />
          )
        }
      />
    );
  };

  return (
    <section className={styles.browse}>
      <div className={styles.playlistsSection}>
        <Heading>Your playlists</Heading>
        {hasPlaylists ? (
          <LibraryPlaylistList
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={onSelectPlaylist}
            onRename={renamePlaylist}
            onDelete={deletePlaylist}
          />
        ) : (
          <p className={styles.emptyPlaylists}>{EMPTY_PLAYLISTS_MESSAGE}</p>
        )}
      </div>

      <div className={styles.header}>
        <Heading>Library — all uploads</Heading>
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
          {hasMedia ? (
            <div className={styles.list}>{media.map(renderItem)}</div>
          ) : (
            <p className={styles.empty}>{EMPTY_MESSAGE}</p>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
