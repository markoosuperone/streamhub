import { describe, it, expect, vi, beforeEach, type MockedObject } from "vitest";
import { PlaylistItemUsecase } from "@/playlists/application/playlist-item.usecase.ts";
import { IPlaylistItemRepository } from "@/playlists/contracts/repository/playlist-item.repository.interface.ts";
import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { IMediaStorage } from "@/media/contracts/repository/mediaStorage.interface.ts";
import { ITransactionManager, IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import {
  MediaItemForCreatePlaylistNotFoundError,
  PlaylistForCreatePlaylistNotFoundError,
  PlaylistItemAlreadyExistsError,
  PlaylistItemNotFoundError,
  PlaylistItemPositionError,
} from "@/playlists/errors/playlist-item.errors.ts";
import { PlaylistNotFoundError } from "@/playlists/errors/playlist.errors.ts";
import {
  makeMedia,
  makePlaylist,
  makePlaylistItem,
} from "@/tests/unit/factories.ts";
import {
  mockMediaRepository,
  mockPlaylistRepository,
  mockPlaylistItemRepository,
  mockTransactionManager,
} from "@/tests/unit/mocks.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const PLAYLIST_ID = "playlist-1";
const ITEM_ID = "item-1";
const MEDIA_ID = "media-1";
const INPUT_MEDIA_ID = "media-2";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PlaylistItemUsecase", () => {
  let playlistItemRepository: MockedObject<IPlaylistItemRepository>;
  let playlistRepository: MockedObject<IPlaylistRepository>;
  let mediaRepository: MockedObject<IMediaStorage>;
  let transactionManager: MockedObject<ITransactionManager<IDbTransaction>>;
  let usecase: PlaylistItemUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    playlistItemRepository = mockPlaylistItemRepository();
    playlistRepository = mockPlaylistRepository();
    mediaRepository = mockMediaRepository();
    transactionManager = mockTransactionManager();
    usecase = new PlaylistItemUsecase(
      playlistItemRepository,
      transactionManager,
      mediaRepository,
      playlistRepository
    );
  });

  // ── createPlaylistItem ────────────────────────────────────────────────────

  describe("createPlaylistItem", () => {
    const input = {
      playlist_id: PLAYLIST_ID,
      media_id: INPUT_MEDIA_ID,
    };

    it("creates item at the end when no position is provided", async () => {
      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue([
        makePlaylistItem({ position: 1 }),
        makePlaylistItem({ id: "item-2", position: 2 }),
      ]);

      await usecase.createPlaylistItem(input, USER_ID);

      expect(playlistItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 }), // 2 existing items → position must be 3
        expect.any(Object)
      );
    });

    it("creates item at position 1 when playlist is empty", async () => {
      const created = makePlaylistItem({ position: 1 });

      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue([]);
      playlistItemRepository.create.mockResolvedValue(created);

      await usecase.createPlaylistItem(input, USER_ID);

      expect(playlistItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 1 }),
        expect.anything()
      );
    });

    it("creates item at the given position when provided", async () => {
      const existingItems = [makePlaylistItem({ id: ITEM_ID, position: 1 })];
      const created = makePlaylistItem({ id: "item-3", position: 2 });

      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue(existingItems);
      playlistItemRepository.create.mockResolvedValue(created);

      await usecase.createPlaylistItem({ ...input, position: 2 }, USER_ID);

      expect(playlistItemRepository.create).toHaveBeenCalledWith(
        {
          playlist_id: PLAYLIST_ID,
          media_id: INPUT_MEDIA_ID,
          position: 2,
        },
        {}
      );
    });

    it("throws PlaylistForCreatePlaylistNotFoundError when playlist is not found", async () => {
      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(null);

      await expect(usecase.createPlaylistItem(input, USER_ID)).rejects.toThrow(
        PlaylistForCreatePlaylistNotFoundError
      );
      expect(playlistItemRepository.create).not.toHaveBeenCalled();
    });

    it("throws MediaItemForCreatePlaylistNotFoundError when media is not found", async () => {
      mediaRepository.getById.mockResolvedValue(null);
      playlistRepository.getById.mockResolvedValue(makePlaylist());

      await expect(usecase.createPlaylistItem(input, USER_ID)).rejects.toThrow(
        MediaItemForCreatePlaylistNotFoundError
      );
      expect(playlistItemRepository.create).not.toHaveBeenCalled();
    });

    it("throws PlaylistItemAlreadyExistsError when media is already in the playlist", async () => {
      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue([
        makePlaylistItem({ media_id: INPUT_MEDIA_ID }),
      ]);

      await expect(usecase.createPlaylistItem(input, USER_ID)).rejects.toThrow(
        PlaylistItemAlreadyExistsError
      );
    });

    it("increments positions when requested position is already taken", async () => {
      const existingItems = [
        makePlaylistItem({ id: "item-1", media_id: "media-other-1", position: 1 }),
        makePlaylistItem({ id: "item-2", media_id: "media-other-2", position: 2 }),
        makePlaylistItem({ id: "item-3", media_id: "media-other-3", position: 3 }),
      ];

      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue(existingItems);
      playlistItemRepository.incrementPosition.mockResolvedValue(false);
      playlistItemRepository.create.mockResolvedValue(makePlaylistItem());

      await usecase.createPlaylistItem({ ...input, position: 2 }, USER_ID);

      // position 2 is taken → shift items from position 2 to lastPosition (3) up by one
      expect(playlistItemRepository.incrementPosition).toHaveBeenCalledWith(
        2, 3, PLAYLIST_ID, expect.any(Object)
      );
      // then create at the requested position
      expect(playlistItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 2 }),
        expect.any(Object)
      );
    });

    it("skips incrementPosition when requested position is free", async () => {
      const existingItems = [
        makePlaylistItem({ id: "item-1", media_id: "media-other-1", position: 1 }),
        makePlaylistItem({ id: "item-2", media_id: "media-other-2", position: 2 }),
      ];

      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue(existingItems);
      playlistItemRepository.create.mockResolvedValue(makePlaylistItem());

      await usecase.createPlaylistItem({ ...input, position: 3 }, USER_ID);

      expect(playlistItemRepository.incrementPosition).not.toHaveBeenCalled();
      expect(playlistItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 }),
        expect.any(Object)
      );
    });

    it("throws PlaylistItemPositionError when position is out of bounds (too high)", async () => {
      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue([
        makePlaylistItem({ id: "item-other", media_id: MEDIA_ID, position: 1 }),
      ]);

      // list has 1 item, so valid range is 1-2; position 5 is out of bounds
      await expect(
        usecase.createPlaylistItem({ ...input, position: 5 }, USER_ID)
      ).rejects.toThrow(PlaylistItemPositionError);
    });

    it("throws PlaylistItemPositionError when position is less than 1", async () => {
      mediaRepository.getById.mockResolvedValue(makeMedia());
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistId.mockResolvedValue([]);

      await expect(
        usecase.createPlaylistItem({ ...input, position: 0 }, USER_ID)
      ).rejects.toThrow(PlaylistItemPositionError);
    });
  });

  // ── getPlaylistItem ───────────────────────────────────────────────────────

  describe("getPlaylistItem", () => {
    it("returns the playlist item when found", async () => {
      const item = makePlaylistItem();
      playlistItemRepository.getById.mockResolvedValue(item);

      const result = await usecase.getPlaylistItem(ITEM_ID, USER_ID);

      expect(playlistItemRepository.getById).toHaveBeenCalledWith(ITEM_ID, USER_ID);
      expect(result).toBe(item);
    });

    it("throws PlaylistItemNotFoundError when item does not exist", async () => {
      playlistItemRepository.getById.mockResolvedValue(null);

      await expect(
        usecase.getPlaylistItem("missing", USER_ID)
      ).rejects.toThrow(PlaylistItemNotFoundError);
    });
  });

  // ── updatePlaylistItem ────────────────────────────────────────────────────

  describe("updatePlaylistItem", () => {
    it("shifts items down when moving to a lower position", async () => {
      const existing = makePlaylistItem({ position: 3 });
      const updated = makePlaylistItem({ position: 1 });

      playlistItemRepository.getById.mockResolvedValue(existing);
      playlistItemRepository.updateForOwner.mockResolvedValue(updated);

      const result = await usecase.updatePlaylistItem(
        ITEM_ID,
        { position: 1, id: ITEM_ID },
        USER_ID
      );

      // moving from 3 → 1: items in range [1, 2] should be shifted down
      expect(playlistItemRepository.decrementPosition).toHaveBeenCalledWith(
        1, 2, PLAYLIST_ID, expect.anything()
      );
      expect(playlistItemRepository.incrementPosition).not.toHaveBeenCalled();
      expect(result).toBe(updated);
    });

    it("shifts items up when moving to a higher position", async () => {
      const existing = makePlaylistItem({ position: 1 });
      const updated = makePlaylistItem({ position: 3 });

      playlistItemRepository.getById.mockResolvedValue(existing);
      playlistItemRepository.updateForOwner.mockResolvedValue(updated);

      const result = await usecase.updatePlaylistItem(
        ITEM_ID,
        { position: 3, id: ITEM_ID },
        USER_ID
      );

      // moving from 1 → 3: items in range [2, 3] should be shifted up
      expect(playlistItemRepository.incrementPosition).toHaveBeenCalledWith(
        2, 3, PLAYLIST_ID, expect.anything()
      );
      expect(playlistItemRepository.decrementPosition).not.toHaveBeenCalled();
      expect(result).toBe(updated);
    });

    it("skips reordering when position is unchanged", async () => {
      const existing = makePlaylistItem({ position: 2 });
      const updated = makePlaylistItem({ position: 2 });

      playlistItemRepository.getById.mockResolvedValue(existing);
      playlistItemRepository.updateForOwner.mockResolvedValue(updated);

      await usecase.updatePlaylistItem(
        ITEM_ID,
        { position: 2, id: ITEM_ID },
        USER_ID
      );

      expect(playlistItemRepository.decrementPosition).not.toHaveBeenCalled();
      expect(playlistItemRepository.incrementPosition).not.toHaveBeenCalled();
    });
  });

  // ── getByPlaylistId ───────────────────────────────────────────────────────

  describe("getByPlaylistId", () => {
    it("returns paginated items for a valid playlist", async () => {
      const items = [
        makePlaylistItem(),
        makePlaylistItem({ id: "item-2", position: 2 }),
      ];
      playlistRepository.getById.mockResolvedValue(makePlaylist());
      playlistItemRepository.getByPlaylistIdPaginated.mockResolvedValue({
        total: 10,
        items,
      });

      const result = await usecase.getByPlaylistId(PLAYLIST_ID, USER_ID, 5, 0);

      expect(playlistItemRepository.getByPlaylistIdPaginated).toHaveBeenCalledWith(
        PLAYLIST_ID, USER_ID, 5, 0
      );
      expect(result).toEqual({ total: 10, items, limit: 5, offset: 0 });
    });

    it("throws PlaylistNotFoundError when playlist does not exist", async () => {
      playlistRepository.getById.mockResolvedValue(null);

      await expect(
        usecase.getByPlaylistId("missing", USER_ID, 5, 0)
      ).rejects.toThrow(PlaylistNotFoundError);

      expect(playlistItemRepository.getByPlaylistIdPaginated).not.toHaveBeenCalled();
    });
  });

  // ── deletePlaylistItem ────────────────────────────────────────────────────

  describe("deletePlaylistItem", () => {
    it("deletes the item and decrements positions after it", async () => {
      const deleted = makePlaylistItem({ position: 2 });
      playlistItemRepository.deleteForOwner.mockResolvedValue(deleted);

      await usecase.deletePlaylistItem(ITEM_ID, USER_ID);

      expect(playlistItemRepository.deleteForOwner).toHaveBeenCalledWith(
        ITEM_ID, USER_ID, expect.anything()
      );
      expect(playlistItemRepository.decrementPositionsAfter).toHaveBeenCalledWith(
        PLAYLIST_ID, 2, expect.anything()
      );
    });

    it("throws PlaylistItemNotFoundError when item does not exist", async () => {
      playlistItemRepository.deleteForOwner.mockResolvedValue(null);

      await expect(
        usecase.deletePlaylistItem("missing", USER_ID)
      ).rejects.toThrow(PlaylistItemNotFoundError);
      expect(playlistItemRepository.decrementPositionsAfter).not.toHaveBeenCalled();
    });
  });
});
