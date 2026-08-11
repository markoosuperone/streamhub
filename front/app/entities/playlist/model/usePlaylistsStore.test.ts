import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/app/shared/api/api.error';

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
const del = vi.fn();

vi.mock('@/app/shared/api/playlists.api', () => ({
  PLAYLISTS_API: {
    list: (...args: unknown[]) => list(...args),
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

const { usePlaylistsStore, PLAYLISTS_STATUS } = await import('./usePlaylistsStore');

function makePlaylist(overrides: Partial<PlaylistResponseDTO> = {}): PlaylistResponseDTO {
  return {
    id: 'playlist-1',
    title: 'My Playlist',
    owner_id: 'owner-1',
    total_items: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as PlaylistResponseDTO;
}

beforeEach(() => {
  usePlaylistsStore.setState({ playlists: [], status: PLAYLISTS_STATUS.idle, error: null });
  list.mockReset();
  create.mockReset();
  update.mockReset();
  del.mockReset();
});

describe('fetchPlaylists', () => {
  it('loads playlists and sets status to loaded', async () => {
    const playlists = [makePlaylist()];
    list.mockResolvedValue({ items: playlists, total: 1, limit: 20, offset: 0 });

    await usePlaylistsStore.getState().fetchPlaylists();

    expect(usePlaylistsStore.getState()).toMatchObject({
      playlists,
      status: PLAYLISTS_STATUS.loaded,
      error: null,
    });
  });

  it('is a no-op when already loading or loaded', async () => {
    usePlaylistsStore.setState({ status: PLAYLISTS_STATUS.loaded });

    await usePlaylistsStore.getState().fetchPlaylists();

    expect(list).not.toHaveBeenCalled();
  });

  it('sets an error status with the ApiError message on failure', async () => {
    list.mockRejectedValue(new ApiError(500, 'Server exploded'));

    await usePlaylistsStore.getState().fetchPlaylists();

    expect(usePlaylistsStore.getState()).toMatchObject({
      status: PLAYLISTS_STATUS.error,
      error: 'Server exploded',
    });
  });

  it('falls back to a generic message for a non-ApiError failure', async () => {
    list.mockRejectedValue(new Error('network down'));

    await usePlaylistsStore.getState().fetchPlaylists();

    expect(usePlaylistsStore.getState().error).toBe('Could not load playlists. Try again.');
  });
});

describe('createPlaylist', () => {
  // Prepended to match the server's newest-first ordering — appending would
  // put a new playlist last until the next reload moved it to the top.
  it('prepends the created playlist and returns it', async () => {
    const existing = makePlaylist({ id: 'existing' });
    usePlaylistsStore.setState({ playlists: [existing] });
    const created = makePlaylist({ id: 'new-one', title: 'New' });
    create.mockResolvedValue(created);

    const result = await usePlaylistsStore.getState().createPlaylist('New');

    expect(create).toHaveBeenCalledWith({ title: 'New' });
    expect(result).toBe(created);
    expect(usePlaylistsStore.getState().playlists).toEqual([created, existing]);
  });
});

describe('renamePlaylist', () => {
  it('replaces the matching playlist with the updated one', async () => {
    const original = makePlaylist({ id: 'p1', title: 'Old' });
    usePlaylistsStore.setState({ playlists: [original] });
    const renamed = makePlaylist({ id: 'p1', title: 'New' });
    update.mockResolvedValue(renamed);

    await usePlaylistsStore.getState().renamePlaylist('p1', 'New');

    expect(update).toHaveBeenCalledWith('p1', { title: 'New' });
    expect(usePlaylistsStore.getState().playlists).toEqual([renamed]);
  });
});

describe('deletePlaylist', () => {
  it('removes the deleted playlist from state', async () => {
    const a = makePlaylist({ id: 'a' });
    const b = makePlaylist({ id: 'b' });
    usePlaylistsStore.setState({ playlists: [a, b] });
    del.mockResolvedValue(undefined);

    await usePlaylistsStore.getState().deletePlaylist('a');

    expect(del).toHaveBeenCalledWith('a');
    expect(usePlaylistsStore.getState().playlists).toEqual([b]);
  });
});

describe('incrementItemCount / decrementItemCount', () => {
  it('increments only the matching playlist', () => {
    const a = makePlaylist({ id: 'a', total_items: 2 });
    const b = makePlaylist({ id: 'b', total_items: 5 });
    usePlaylistsStore.setState({ playlists: [a, b] });

    usePlaylistsStore.getState().incrementItemCount('a');

    const [updatedA, updatedB] = usePlaylistsStore.getState().playlists;
    expect(updatedA?.total_items).toBe(3);
    expect(updatedB?.total_items).toBe(5);
  });

  it('decrements but never below zero', () => {
    const a = makePlaylist({ id: 'a', total_items: 0 });
    usePlaylistsStore.setState({ playlists: [a] });

    usePlaylistsStore.getState().decrementItemCount('a');

    expect(usePlaylistsStore.getState().playlists[0]!.total_items).toBe(0);
  });
});

describe('reset', () => {
  it('clears playlists and status back to idle', () => {
    usePlaylistsStore.setState({
      playlists: [makePlaylist()],
      status: PLAYLISTS_STATUS.loaded,
      error: 'stale error',
    });

    usePlaylistsStore.getState().reset();

    expect(usePlaylistsStore.getState()).toMatchObject({
      playlists: [],
      status: PLAYLISTS_STATUS.idle,
      error: null,
    });
  });
});
