import { describe, it, expect, vi, beforeEach, type MockedObject } from "vitest";
import { PlaylistUsecase } from "@/playlists/application/playlist.usecase.ts";
import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { PlaylistNotFoundError } from "@/playlists/errors/playlist.errors.ts";
import { makePlaylist } from "@/tests/unit/factories.ts";
import { mockPlaylistRepository } from "@/tests/unit/mocks.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const OWNER_ID = "user-1";
const PLAYLIST_ID = "playlist-1";
const PLAYLIST_TITLE = "My Playlist";
const UPDATED_TITLE = "New Title";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PlaylistUsecase", () => {
  let playlistRepository: MockedObject<IPlaylistRepository>;
  let usecase: PlaylistUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    playlistRepository = mockPlaylistRepository();
    usecase = new PlaylistUsecase(playlistRepository);
  });

  // ── createPlaylist ──────────────────────────────────────────────────────────

  describe("createPlaylist", () => {
    it("should call repository.create once", async () => {
      playlistRepository.create.mockResolvedValue(makePlaylist());

      await usecase.createPlaylist({ owner_id: OWNER_ID, title: PLAYLIST_TITLE });

      expect(playlistRepository.create).toHaveBeenCalledOnce();
    });

    it("should pass owner_id through unchanged", async () => {
      playlistRepository.create.mockResolvedValue(makePlaylist());

      await usecase.createPlaylist({ owner_id: OWNER_ID, title: PLAYLIST_TITLE });

      expect(playlistRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ owner_id: OWNER_ID })
      );
    });

    it("should normalize the title before passing to repository", async () => {
      playlistRepository.create.mockResolvedValue(makePlaylist());

      await usecase.createPlaylist({ owner_id: OWNER_ID, title: "  my--playlist!!  " });

      const [createArg] = playlistRepository.create.mock.calls[0]!;
      // normalizeTitle should clean up the raw title; whatever it produces
      // must differ from the raw input and be a non-empty string
      expect(typeof createArg.title).toBe("string");
      expect(createArg.title.length).toBeGreaterThan(0);
      expect(createArg.title).not.toBe("  my--playlist!!  ");
    });

    it("should return the playlist returned by repository", async () => {
      const playlist = makePlaylist();
      playlistRepository.create.mockResolvedValue(playlist);

      const result = await usecase.createPlaylist({
        owner_id: OWNER_ID,
        title: PLAYLIST_TITLE,
      });

      expect(result).toBe(playlist);
    });

    it("should throw when repository.create rejects", async () => {
      playlistRepository.create.mockRejectedValue(new Error("DB error"));

      await expect(
        usecase.createPlaylist({ owner_id: OWNER_ID, title: PLAYLIST_TITLE })
      ).rejects.toThrow("DB error");
    });
  });

  // ── getPlaylist ─────────────────────────────────────────────────────────────

  describe("getPlaylist", () => {
    it("should return the playlist when found", async () => {
      const playlist = makePlaylist();
      playlistRepository.getById.mockResolvedValue(playlist);

      const result = await usecase.getPlaylist(PLAYLIST_ID, OWNER_ID);

      expect(playlistRepository.getById).toHaveBeenCalledWith(PLAYLIST_ID, OWNER_ID);
      expect(result).toBe(playlist);
    });

    it("should throw PlaylistNotFoundError when playlist does not exist", async () => {
      playlistRepository.getById.mockResolvedValue(null);

      await expect(usecase.getPlaylist("missing", OWNER_ID)).rejects.toThrow(
        PlaylistNotFoundError
      );
    });

    it("should throw when repository.getById rejects", async () => {
      playlistRepository.getById.mockRejectedValue(new Error("DB error"));

      await expect(usecase.getPlaylist(PLAYLIST_ID, OWNER_ID)).rejects.toThrow("DB error");
    });
  });

  // ── getPlaylistByOwnerId ────────────────────────────────────────────────────

  describe("getPlaylistByOwnerId", () => {
    it("should return correct paginated shape", async () => {
      const items = [makePlaylist(), makePlaylist({ id: "playlist-2" })];
      playlistRepository.getByOwnerId.mockResolvedValue({ total: 20, items });

      const result = await usecase.getPlaylistByOwnerId(OWNER_ID, 10, 5);

      expect(playlistRepository.getByOwnerId).toHaveBeenCalledWith(OWNER_ID, 10, 5);
      expect(result).toEqual({ total: 20, items, limit: 10, offset: 5 });
    });

    it("should return empty items when owner has no playlists", async () => {
      playlistRepository.getByOwnerId.mockResolvedValue({ total: 0, items: [] });

      const result = await usecase.getPlaylistByOwnerId(OWNER_ID, 10, 0);

      expect(result).toEqual({ total: 0, items: [], limit: 10, offset: 0 });
    });

    it("should throw when repository.getByOwnerId rejects", async () => {
      playlistRepository.getByOwnerId.mockRejectedValue(new Error("DB error"));

      await expect(usecase.getPlaylistByOwnerId(OWNER_ID, 10, 0)).rejects.toThrow("DB error");
    });
  });

  // ── updatePlaylist ──────────────────────────────────────────────────────────

  describe("updatePlaylist", () => {
    it("should return the updated playlist", async () => {
      const updated = makePlaylist({ title: UPDATED_TITLE });
      playlistRepository.update.mockResolvedValue(updated);

      const result = await usecase.updatePlaylist(
        PLAYLIST_ID,
        { title: UPDATED_TITLE, id: PLAYLIST_ID },
        OWNER_ID
      );

      expect(result).toBe(updated);
    });

    it("should pass id merged into the update dto", async () => {
      playlistRepository.update.mockResolvedValue(makePlaylist());

      await usecase.updatePlaylist(
        PLAYLIST_ID,
        { title: UPDATED_TITLE, id: PLAYLIST_ID },
        OWNER_ID
      );

      expect(playlistRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: PLAYLIST_ID, title: UPDATED_TITLE }),
        OWNER_ID
      );
    });

    it("should throw PlaylistNotFoundError when repository returns null", async () => {
      playlistRepository.update.mockResolvedValue(null);

      await expect(
        usecase.updatePlaylist("missing", { title: UPDATED_TITLE, id: PLAYLIST_ID }, OWNER_ID)
      ).rejects.toThrow(PlaylistNotFoundError);
    });

    it("should throw when repository.update rejects", async () => {
      playlistRepository.update.mockRejectedValue(new Error("DB error"));

      await expect(
        usecase.updatePlaylist(PLAYLIST_ID, { title: UPDATED_TITLE, id: PLAYLIST_ID }, OWNER_ID)
      ).rejects.toThrow("DB error");
    });
  });

  // ── deletePlaylist ──────────────────────────────────────────────────────────

  describe("deletePlaylist", () => {
    it("should resolve when playlist is deleted", async () => {
      playlistRepository.delete.mockResolvedValue(true);

      await expect(
        usecase.deletePlaylist(PLAYLIST_ID, OWNER_ID)
      ).resolves.toBeUndefined();

      expect(playlistRepository.delete).toHaveBeenCalledWith(PLAYLIST_ID, OWNER_ID);
    });

    it("should throw PlaylistNotFoundError when repository returns false", async () => {
      playlistRepository.delete.mockResolvedValue(false);

      await expect(
        usecase.deletePlaylist("missing", OWNER_ID)
      ).rejects.toThrow(PlaylistNotFoundError);
    });

    it("should throw when repository.delete rejects", async () => {
      playlistRepository.delete.mockRejectedValue(new Error("DB error"));

      await expect(
        usecase.deletePlaylist(PLAYLIST_ID, OWNER_ID)
      ).rejects.toThrow("DB error");
    });
  });
});
