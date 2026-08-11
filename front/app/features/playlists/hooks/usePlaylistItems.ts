'use client';

import type { PlaylistItemWithMediaResponseDTO } from '@superplayer/contracts';
import { useEffect } from 'react';

import {
  PLAYLIST_ITEMS_STATUS,
  type PlaylistItemsStatus,
  usePlaylistItemsStore,
} from '@/app/entities/playlist/model/usePlaylistItemsStore';

type UsePlaylistItemsResult = {
  items: PlaylistItemWithMediaResponseDTO[];
  status: PlaylistItemsStatus;
  error: string | null;
  removeItem: (itemId: string) => Promise<void>;
};

// Thin wrapper over the shared store, same shape as usePlaylists — fetches1
// the given playlist's tracks on mount/playlistId change and exposes a
// narrow, playlist-scoped view of the store.
export function usePlaylistItems(playlistId: string | null): UsePlaylistItemsResult {
  const entry = usePlaylistItemsStore((state) =>
    playlistId ? state.byPlaylist[playlistId] : undefined,
  );
  const fetchItems = usePlaylistItemsStore((state) => state.fetchItems);
  const storeRemoveItem = usePlaylistItemsStore((state) => state.removeItem);

  useEffect(() => {
    if (playlistId) void fetchItems(playlistId);
  }, [playlistId, fetchItems]);

  return {
    items: entry?.items ?? [],
    status: entry?.status ?? PLAYLIST_ITEMS_STATUS.idle,
    error: entry?.error ?? null,
    removeItem: (itemId: string) => {
      if (!playlistId) return Promise.resolve();
      return storeRemoveItem(playlistId, itemId);
    },
  };
}
