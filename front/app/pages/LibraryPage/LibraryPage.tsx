'use client';

import { DragDropProvider, DragEndEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import type { MediaResponseDTO } from '@superplayer/contracts';
import { Suspense, useState } from 'react';

import { usePlaylistItemsStore } from '@/app/entities/playlist/model/usePlaylistItemsStore';
import { usePlaylists } from '@/app/features/playlists/hooks/usePlaylists';
import { ApiError } from '@/app/shared/api/api.error';
import { LibraryBrowser } from '@/app/widgets/LibraryBrowser/LibraryBrowser';
import { LibraryBrowserSkeleton } from '@/app/widgets/LibraryBrowser/LibraryBrowserSkeleton';
import { PlaylistTracksRail } from '@/app/widgets/PlaylistTracksRail/PlaylistTracksRail';

import styles from './LibraryPage.module.css';

function LibraryContent() {
  const { playlists } = usePlaylists();
  const [explicitSelection, setExplicitSelection] = useState<string | null>(null);

  // Derived, not synced via effect: falls back to the first playlist
  // whenever there's no explicit pick yet, or the previously picked one no
  // longer exists (e.g. deleted from the "Your playlists" row) — the same
  // fallback the design specifies for playlist delete.
  const explicitSelectionExists = playlists.some((playlist) => playlist.id === explicitSelection);
  const selectedPlaylistId = explicitSelectionExists
    ? explicitSelection
    : (playlists[0]?.id ?? null);

  const moveItem = usePlaylistItemsStore((state) => state.moveItem);
  const addItemToPlaylist = usePlaylistItemsStore((state) => state.addItemToPlaylist);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (event.canceled) return;

    const { source, target } = event.operation;
    if (!source || !target) return;

    const sourceData = source.data;

    // PlaylistTrackRow's rows are sortable — a drag among them reorders the
    // dragged track within its playlist.
    if (isSortable(source)) {
      if (!selectedPlaylistId) return;
      try {
        // source.id is the dragged item's own id — target.id would be
        // whatever it was dropped onto instead.
        await moveItem(selectedPlaylistId, String(source.id), source.index);
      } catch (err) {
        console.error('Could not reorder playlist track', err);
      }
      return;
    }

    // Only MediaListItem attaches `data` to its drag source. Anything else
    // that ends up in this provider carries none, so bail out rather than
    // misreading an unrelated drop as a media add.
    if (!sourceData) return;

    // MediaListItem sets `data` to the full media object it's dragging —
    // avoids a separate lookup here for what media was actually dropped.
    const media = sourceData as MediaResponseDTO;
    const playlistId = String(target.id);

    try {
      await addItemToPlaylist(playlistId, media);
    } catch (err) {
      // Same "no toast system yet" gap as MediaUploadButton — a duplicate
      // (already in that playlist) or network failure surfaces as the drop
      // silently not adding anything, rather than a visible error.
      const message = err instanceof ApiError ? err.message : 'Could not add to playlist';
      console.error(message, err);
    }
  };

  return (
    <div className={styles.page}>
      <DragDropProvider onDragEnd={handleDragEnd}>
        {/* Required, not decorative: LibraryBrowser reads useSearchParams, and
            without a boundary the production build fails to prerender this
            route. Scoped to it alone so PlaylistTracksRail — which reads none —
            still reaches the static HTML. It stays inside DragDropProvider so
            both panes keep sharing one drag context and one selection. */}
        <Suspense fallback={<LibraryBrowserSkeleton />}>
          <LibraryBrowser
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={setExplicitSelection}
          />
        </Suspense>
        <PlaylistTracksRail playlistId={selectedPlaylistId} />
      </DragDropProvider>
    </div>
  );
}

export function LibraryPage() {
  return <LibraryContent />;
}
