'use client';

import type { MediaResponseDTO, PlaylistItemWithMediaResponseDTO } from '@superplayer/contracts';
import { create } from 'zustand';

import { usePlaylistsStore } from '@/app/entities/playlist/model/usePlaylistsStore';
import { ApiError } from '@/app/shared/api/api.error';
import { PLAYLIST_ITEMS_API } from '@/app/shared/api/playlistItems.api';

export const PLAYLIST_ITEMS_STATUS = {
  idle: 'idle',
  loading: 'loading',
  loaded: 'loaded',
  error: 'error',
} as const;

export type PlaylistItemsStatus =
  (typeof PLAYLIST_ITEMS_STATUS)[keyof typeof PLAYLIST_ITEMS_STATUS];

const FALLBACK_ERROR_MESSAGE = 'Could not load playlist tracks. Try again.';
const PLAYLIST_ITEMS_LIMIT = 100;

type PlaylistItemsEntry = {
  items: PlaylistItemWithMediaResponseDTO[];
  status: PlaylistItemsStatus;
  error: string | null;
};

const EMPTY_ENTRY: PlaylistItemsEntry = {
  items: [],
  status: PLAYLIST_ITEMS_STATUS.idle,
  error: null,
};

interface PlaylistItemsStoreState {
  byPlaylist: Record<string, PlaylistItemsEntry>;
  // Idempotent per playlist id — same loaded/loading guard shape as
  // usePlaylistsStore.fetchPlaylists, so switching the selected playlist back
  // and forth doesn't refetch what's already loaded. Shared (not per-hook
  // local state) so a drag-and-drop drop handler at the page level — outside
  // PlaylistTracksRail's own subtree — can read/mutate a playlist's items
  // directly.
  fetchItems: (playlistId: string) => Promise<void>;
  removeItem: (playlistId: string, itemId: string) => Promise<void>;
  // Called after AddToPlaylistModal adds a track to a playlist elsewhere on
  // the page — appends using the data already on hand (the create response
  // + the media object the modal already has) instead of refetching. Only
  // touches an already-loaded entry: a playlist that was never selected this
  // session has no array to append to, and will simply fetch fresh (already
  // including this item) the first time it is.
  addItem: (playlistId: string, item: PlaylistItemWithMediaResponseDTO) => void;
  // Creates the playlist-item via the API, then reflects it locally and bumps
  // the playlist's item count — the one sequence both AddToPlaylistModal and
  // LibraryPage's drag-to-add drop handler need, kept here so the two call
  // sites can't drift out of sync with each other.
  addItemToPlaylist: (playlistId: string, media: MediaResponseDTO) => Promise<void>;
  // Persists a track's new position within its playlist, then reflects the
  // reorder in byPlaylist so the rail's order survives a re-render (dnd-kit's
  // own drag-time DOM reordering is purely visual and doesn't touch state).
  moveItem: (playlistId: string, itemId: string, toIndex: number) => Promise<void>;
  // Drops every cached playlist back to unfetched. Needed on sign-out because
  // `fetchItems` skips anything already `loaded`: without this, a second
  // session in the same tab would keep serving the first session's tracks
  // instead of ever asking the server again.
  reset: () => void;
}

export const usePlaylistItemsStore = create<PlaylistItemsStoreState>((set, get) => ({
  byPlaylist: {},
  fetchItems: async (playlistId) => {
    const entry = get().byPlaylist[playlistId];
    if (
      entry?.status === PLAYLIST_ITEMS_STATUS.loading ||
      entry?.status === PLAYLIST_ITEMS_STATUS.loaded
    ) {
      return;
    }
    set((state) => ({
      byPlaylist: {
        ...state.byPlaylist,
        [playlistId]: {
          ...EMPTY_ENTRY,
          ...entry,
          status: PLAYLIST_ITEMS_STATUS.loading,
          error: null,
        },
      },
    }));
    try {
      const page = await PLAYLIST_ITEMS_API.listByPlaylist(playlistId, {
        limit: PLAYLIST_ITEMS_LIMIT,
        offset: 0,
      });
      set((state) => ({
        byPlaylist: {
          ...state.byPlaylist,
          [playlistId]: { items: page.items, status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
        },
      }));
    } catch (err) {
      set((state) => ({
        byPlaylist: {
          ...state.byPlaylist,
          [playlistId]: {
            items: state.byPlaylist[playlistId]?.items ?? [],
            status: PLAYLIST_ITEMS_STATUS.error,
            error: err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE,
          },
        },
      }));
    }
  },
  removeItem: async (playlistId, itemId) => {
    await PLAYLIST_ITEMS_API.delete(itemId);
    set((state) => {
      const entry = state.byPlaylist[playlistId];
      if (!entry) return state;
      return {
        byPlaylist: {
          ...state.byPlaylist,
          [playlistId]: { ...entry, items: entry.items.filter((item) => item.id !== itemId) },
        },
      };
    });
    usePlaylistsStore.getState().decrementItemCount(playlistId);
  },
  addItem: (playlistId, item) =>
    set((state) => {
      const entry = state.byPlaylist[playlistId];
      if (!entry || entry.status !== PLAYLIST_ITEMS_STATUS.loaded) return state;
      return {
        byPlaylist: {
          ...state.byPlaylist,
          [playlistId]: { ...entry, items: [...entry.items, item] },
        },
      };
    }),
  addItemToPlaylist: async (playlistId, media) => {
    const created = await PLAYLIST_ITEMS_API.create({
      playlist_id: playlistId,
      media_id: media.id,
    });
    get().addItem(playlistId, { ...created, media });
    usePlaylistsStore.getState().incrementItemCount(playlistId);
  },
  moveItem: async (playlistId, itemId, toIndex) => {
    const entry = get().byPlaylist[playlistId];
    if (!entry) return;
    const currentIndex = entry.items.findIndex((item) => item.id === itemId);
    if (currentIndex === -1 || currentIndex === toIndex) return;

    // Backend position is 1-indexed.
    await PLAYLIST_ITEMS_API.update(itemId, { position: toIndex + 1 });

    set((state) => {
      const current = state.byPlaylist[playlistId];
      if (!current) return state;
      // Located again rather than reusing the index from before the request:
      // a concurrent add or remove during the round trip would have shifted
      // it, and splicing at a stale index moves the wrong track.
      const fromIndex = current.items.findIndex((item) => item.id === itemId);
      if (fromIndex === -1) return state;

      const items = [...current.items];
      const [moved] = items.splice(fromIndex, 1);
      if (!moved) return state;
      items.splice(toIndex, 0, moved);
      return {
        byPlaylist: {
          ...state.byPlaylist,
          [playlistId]: { ...current, items },
        },
      };
    });
  },
  reset: () => set({ byPlaylist: {} }),
}));
