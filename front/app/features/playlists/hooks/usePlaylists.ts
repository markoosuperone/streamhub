'use client';

import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { useEffect } from 'react';

import { usePlaylistsStore } from '@/app/entities/playlist/model/usePlaylistsStore';

type UsePlaylistsResult = {
  playlists: PlaylistResponseDTO[];
  createPlaylist: (title: string) => Promise<PlaylistResponseDTO>;
  renamePlaylist: (id: string, title: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
};

// Thin wrapper over the shared store: every consumer used to own its own
// fetch + local list, which let PlaylistsRail and AddToPlaylistModal drift
// out of sync with each other. Same public shape as before, so call sites
// don't change — only the backing state does.
export function usePlaylists(): UsePlaylistsResult {
  const playlists = usePlaylistsStore((state) => state.playlists);
  const fetchPlaylists = usePlaylistsStore((state) => state.fetchPlaylists);
  const createPlaylist = usePlaylistsStore((state) => state.createPlaylist);
  const renamePlaylist = usePlaylistsStore((state) => state.renamePlaylist);
  const deletePlaylist = usePlaylistsStore((state) => state.deletePlaylist);

  useEffect(() => {
    void fetchPlaylists();
  }, [fetchPlaylists]);

  return { playlists, createPlaylist, renamePlaylist, deletePlaylist };
}
