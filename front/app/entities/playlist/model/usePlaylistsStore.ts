'use client';

import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { create } from 'zustand';

import { ApiError } from '@/app/shared/api/api.error';
import { PLAYLISTS_API } from '@/app/shared/api/playlists.api';

export const PLAYLISTS_STATUS = {
  idle: 'idle',
  loading: 'loading',
  loaded: 'loaded',
  error: 'error',
} as const;

export type PlaylistsStatus = (typeof PLAYLISTS_STATUS)[keyof typeof PLAYLISTS_STATUS];

const FALLBACK_ERROR_MESSAGE = 'Could not load playlists. Try again.';

interface PlaylistsStoreState {
  playlists: PlaylistResponseDTO[];
  status: PlaylistsStatus;
  error: string | null;
  // Idempotent — safe to call from every consumer's mount effect. Only the
  // first caller actually fetches (status `idle`, or `error` so a failed
  // fetch can be retried); the rest read the same in-flight/loaded state,
  // so PlaylistsRail and AddToPlaylistModal share one list instead of each
  // owning a private copy that can drift out of sync with the other.
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (title: string) => Promise<PlaylistResponseDTO>;
  renamePlaylist: (id: string, title: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  // Local-only count adjustments, not backed by their own API call — called
  // after a playlist-item add/remove elsewhere (AddToPlaylistModal,
  // usePlaylistItemsStore) so `total_items` here stays correct without a
  // refetch.
  incrementItemCount: (id: string) => void;
  decrementItemCount: (id: string) => void;
  // Full clear plus resetting `status` back to `idle` — not just emptying
  // the list — so the next mount's fetchPlaylists() actually refetches
  // instead of treating stale data as already loaded. Used on sign-out so a
  // different user logging in in the same tab doesn't see the previous
  // session's playlists.
  reset: () => void;
}

export const usePlaylistsStore = create<PlaylistsStoreState>((set, get) => ({
  playlists: [],
  status: PLAYLISTS_STATUS.idle,
  error: null,
  fetchPlaylists: async () => {
    const { status } = get();
    if (status === PLAYLISTS_STATUS.loading || status === PLAYLISTS_STATUS.loaded) return;
    set({ status: PLAYLISTS_STATUS.loading, error: null });
    try {
      const page = await PLAYLISTS_API.list();
      set({ playlists: page.items, status: PLAYLISTS_STATUS.loaded });
    } catch (err) {
      set({
        status: PLAYLISTS_STATUS.error,
        error: err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE,
      });
    }
  },
  createPlaylist: async (title) => {
    const playlist = await PLAYLISTS_API.create({ title });
    // Prepended, not appended: the server returns playlists newest-first
    // (`ORDER BY created_at DESC`), so appending would put a new playlist last
    // here and first after the next reload.
    set((state) => ({ playlists: [playlist, ...state.playlists] }));
    return playlist;
  },
  renamePlaylist: async (id, title) => {
    const playlist = await PLAYLISTS_API.update(id, { title });
    set((state) => ({
      playlists: state.playlists.map((item) => (item.id === id ? playlist : item)),
    }));
  },
  deletePlaylist: async (id) => {
    await PLAYLISTS_API.delete(id);
    set((state) => ({ playlists: state.playlists.filter((item) => item.id !== id) }));
  },
  incrementItemCount: (id) =>
    set((state) => ({
      playlists: state.playlists.map((item) =>
        item.id === id ? { ...item, total_items: item.total_items + 1 } : item,
      ),
    })),
  decrementItemCount: (id) =>
    set((state) => ({
      playlists: state.playlists.map((item) =>
        item.id === id ? { ...item, total_items: Math.max(0, item.total_items - 1) } : item,
      ),
    })),
  reset: () => set({ playlists: [], status: PLAYLISTS_STATUS.idle, error: null }),
}));
