import type { MediaResponseDTO, PlaylistItemWithMediaResponseDTO } from '@superplayer/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/app/shared/api/api.error';

const listByPlaylist = vi.fn();
const del = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock('@/app/shared/api/playlistItems.api', () => ({
  PLAYLIST_ITEMS_API: {
    listByPlaylist: (...args: unknown[]) => listByPlaylist(...args),
    delete: (...args: unknown[]) => del(...args),
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
  },
}));

const decrementItemCount = vi.fn();
const incrementItemCount = vi.fn();

vi.mock('@/app/entities/playlist/model/usePlaylistsStore', () => ({
  usePlaylistsStore: {
    getState: () => ({ decrementItemCount, incrementItemCount }),
  },
}));

const { usePlaylistItemsStore, PLAYLIST_ITEMS_STATUS } = await import('./usePlaylistItemsStore');

const PLAYLIST_ID = 'playlist-1';

function makeItem(
  overrides: Partial<PlaylistItemWithMediaResponseDTO> = {},
): PlaylistItemWithMediaResponseDTO {
  return {
    id: 'item-1',
    playlist_id: PLAYLIST_ID,
    media_id: 'media-1',
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    media: {
      id: 'media-1',
      title: 'Track',
      media_type: 'audio',
      duration_seconds: 100,
    } as MediaResponseDTO,
    ...overrides,
  } as PlaylistItemWithMediaResponseDTO;
}

beforeEach(() => {
  usePlaylistItemsStore.setState({ byPlaylist: {} });
  listByPlaylist.mockReset();
  del.mockReset();
  create.mockReset();
  update.mockReset();
  decrementItemCount.mockReset();
  incrementItemCount.mockReset();
});

describe('fetchItems', () => {
  it('loads a playlist entry and marks it loaded', async () => {
    const items = [makeItem()];
    listByPlaylist.mockResolvedValue({ items, total: 1, limit: 100, offset: 0 });

    await usePlaylistItemsStore.getState().fetchItems(PLAYLIST_ID);

    expect(usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID]).toMatchObject({
      items,
      status: PLAYLIST_ITEMS_STATUS.loaded,
      error: null,
    });
  });

  it('is idempotent while loading or already loaded', async () => {
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [], status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
      },
    });

    await usePlaylistItemsStore.getState().fetchItems(PLAYLIST_ID);

    expect(listByPlaylist).not.toHaveBeenCalled();
  });

  it('sets an error entry on failure, keeping any existing items', async () => {
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [makeItem()], status: PLAYLIST_ITEMS_STATUS.error, error: null },
      },
    });
    listByPlaylist.mockRejectedValue(new ApiError(500, 'boom'));

    await usePlaylistItemsStore.getState().fetchItems(PLAYLIST_ID);

    const entry = usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID];
    expect(entry?.status).toBe(PLAYLIST_ITEMS_STATUS.error);
    expect(entry?.error).toBe('boom');
    expect(entry?.items).toHaveLength(1);
  });
});

describe('removeItem', () => {
  it('deletes via the API, drops the item locally, and decrements the playlist count', async () => {
    const item = makeItem({ id: 'to-remove' });
    const other = makeItem({ id: 'keep' });
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [item, other], status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
      },
    });
    del.mockResolvedValue(undefined);

    await usePlaylistItemsStore.getState().removeItem(PLAYLIST_ID, 'to-remove');

    expect(del).toHaveBeenCalledWith('to-remove');
    expect(usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID]?.items).toEqual([other]);
    expect(decrementItemCount).toHaveBeenCalledWith(PLAYLIST_ID);
  });
});

describe('addItem', () => {
  it('appends to an already-loaded entry', () => {
    const existing = makeItem({ id: 'existing' });
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [existing], status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
      },
    });
    const added = makeItem({ id: 'added' });

    usePlaylistItemsStore.getState().addItem(PLAYLIST_ID, added);

    expect(usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID]?.items).toEqual([
      existing,
      added,
    ]);
  });

  it('is a no-op when the playlist has never been loaded', () => {
    usePlaylistItemsStore.getState().addItem(PLAYLIST_ID, makeItem());

    expect(usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID]).toBeUndefined();
  });
});

describe('addItemToPlaylist', () => {
  it('creates via the API, appends locally, and increments the playlist count', async () => {
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [], status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
      },
    });
    const media = { id: 'media-2', title: 'New track' } as MediaResponseDTO;
    const created = makeItem({ id: 'created', media_id: media.id });
    create.mockResolvedValue(created);

    await usePlaylistItemsStore.getState().addItemToPlaylist(PLAYLIST_ID, media);

    expect(create).toHaveBeenCalledWith({ playlist_id: PLAYLIST_ID, media_id: media.id });
    expect(usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID]?.items).toEqual([
      { ...created, media },
    ]);
    expect(incrementItemCount).toHaveBeenCalledWith(PLAYLIST_ID);
  });
});

describe('moveItem', () => {
  it('persists the new 1-indexed position and reorders the local items', async () => {
    const a = makeItem({ id: 'a', position: 1 });
    const b = makeItem({ id: 'b', position: 2 });
    const c = makeItem({ id: 'c', position: 3 });
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [a, b, c], status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
      },
    });
    update.mockResolvedValue(undefined);

    // Move "c" (index 2) to the front (index 0).
    await usePlaylistItemsStore.getState().moveItem(PLAYLIST_ID, 'c', 0);

    expect(update).toHaveBeenCalledWith('c', { position: 1 });
    expect(
      usePlaylistItemsStore.getState().byPlaylist[PLAYLIST_ID]?.items.map((item) => item.id),
    ).toEqual(['c', 'a', 'b']);
  });

  it('does nothing when the item is already at the target index', async () => {
    const a = makeItem({ id: 'a', position: 1 });
    usePlaylistItemsStore.setState({
      byPlaylist: {
        [PLAYLIST_ID]: { items: [a], status: PLAYLIST_ITEMS_STATUS.loaded, error: null },
      },
    });

    await usePlaylistItemsStore.getState().moveItem(PLAYLIST_ID, 'a', 0);

    expect(update).not.toHaveBeenCalled();
  });

  it('does nothing when the playlist has no loaded entry', async () => {
    await usePlaylistItemsStore.getState().moveItem(PLAYLIST_ID, 'a', 0);

    expect(update).not.toHaveBeenCalled();
  });
});
