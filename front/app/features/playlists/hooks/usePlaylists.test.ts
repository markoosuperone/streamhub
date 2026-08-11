import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchPlaylists = vi.fn();
const createPlaylist = vi.fn();
const renamePlaylist = vi.fn();
const deletePlaylist = vi.fn();
let playlists: PlaylistResponseDTO[] = [];

vi.mock('@/app/entities/playlist/model/usePlaylistsStore', () => ({
  usePlaylistsStore: (selector: (state: unknown) => unknown) =>
    selector({ playlists, fetchPlaylists, createPlaylist, renamePlaylist, deletePlaylist }),
}));

const { usePlaylists } = await import('./usePlaylists');

beforeEach(() => {
  playlists = [];
  fetchPlaylists.mockClear();
  createPlaylist.mockClear();
  renamePlaylist.mockClear();
  deletePlaylist.mockClear();
});

describe('usePlaylists', () => {
  it('calls fetchPlaylists on mount', () => {
    renderHook(() => usePlaylists());

    expect(fetchPlaylists).toHaveBeenCalledTimes(1);
  });

  it('exposes the store playlists and actions', () => {
    playlists = [{ id: 'p1' } as PlaylistResponseDTO];

    const { result } = renderHook(() => usePlaylists());

    expect(result.current.playlists).toEqual(playlists);
    expect(result.current.createPlaylist).toBe(createPlaylist);
    expect(result.current.renamePlaylist).toBe(renamePlaylist);
    expect(result.current.deletePlaylist).toBe(deletePlaylist);
  });
});
