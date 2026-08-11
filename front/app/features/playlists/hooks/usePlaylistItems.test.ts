import type { PlaylistItemWithMediaResponseDTO } from '@superplayer/contracts';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchItems = vi.fn();
const storeRemoveItem = vi.fn();
let byPlaylist: Record<
  string,
  { items: PlaylistItemWithMediaResponseDTO[]; status: string; error: string | null }
> = {};

vi.mock('@/app/entities/playlist/model/usePlaylistItemsStore', () => ({
  PLAYLIST_ITEMS_STATUS: { idle: 'idle', loading: 'loading', loaded: 'loaded', error: 'error' },
  usePlaylistItemsStore: (selector: (state: unknown) => unknown) =>
    selector({ byPlaylist, fetchItems, removeItem: storeRemoveItem }),
}));

const { usePlaylistItems } = await import('./usePlaylistItems');

beforeEach(() => {
  byPlaylist = {};
  fetchItems.mockClear();
  storeRemoveItem.mockClear();
});

describe('usePlaylistItems', () => {
  it('fetches items for the given playlist on mount', () => {
    renderHook(() => usePlaylistItems('playlist-1'));

    expect(fetchItems).toHaveBeenCalledWith('playlist-1');
  });

  it('does not fetch when playlistId is null', () => {
    renderHook(() => usePlaylistItems(null));

    expect(fetchItems).not.toHaveBeenCalled();
  });

  it('returns idle/empty defaults when there is no store entry yet', () => {
    const { result } = renderHook(() => usePlaylistItems('playlist-1'));

    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it("returns the matching playlist's entry from the store", () => {
    const items = [{ id: 'item-1' } as PlaylistItemWithMediaResponseDTO];
    byPlaylist = { 'playlist-1': { items, status: 'loaded', error: null } };

    const { result } = renderHook(() => usePlaylistItems('playlist-1'));

    expect(result.current.items).toEqual(items);
    expect(result.current.status).toBe('loaded');
  });

  it('removeItem delegates to the store with the playlist id and item id', async () => {
    const { result } = renderHook(() => usePlaylistItems('playlist-1'));

    await result.current.removeItem('item-1');

    expect(storeRemoveItem).toHaveBeenCalledWith('playlist-1', 'item-1');
  });

  it('removeItem resolves without calling the store when playlistId is null', async () => {
    const { result } = renderHook(() => usePlaylistItems(null));

    await result.current.removeItem('item-1');

    expect(storeRemoveItem).not.toHaveBeenCalled();
  });
});
