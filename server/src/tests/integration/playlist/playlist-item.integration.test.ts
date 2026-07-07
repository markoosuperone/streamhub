import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { getDb } from "@/shared/db/postgres.ts";
import {
  type AuthResult,
  cleanDb,
  createPlaylist,
  createTestApp,
  registerUser,
  seedMediaRecord,
  teardown,
} from "@/tests/integration/setup.ts";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Playlist item routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await teardown(app);
  });

  beforeEach(async () => {
    await cleanDb();
  });

  async function setupPlaylistWithMedia(): Promise<{
    user: AuthResult;
    playlistId: string;
    mediaId: string;
  }> {
    const user = await registerUser(app, `owner-${randomUUID()}@test.com`);
    const playlist = await createPlaylist(app, user, "Party Time");
    const media = await seedMediaRecord(user.user_id);
    return { user, playlistId: playlist.id, mediaId: media.id };
  }

  async function createItem(
    user: AuthResult,
    playlistId: string,
    mediaId: string,
    position?: number,
  ) {
    const res = await app.inject({
      method: "POST",
      url: "/playlist-items",
      headers: { authorization: user.authHeader },
      payload: {
        playlist_id: playlistId,
        media_id: mediaId,
        ...(position ? { position } : {}),
      },
    });
    return JSON.parse(res.body);
  }

  // ── POST /playlist-items ─────────────────────────────────────────────────

  describe("POST /playlist-items", () => {
    it("appends the first item at position 1", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlistId, media_id: mediaId },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({
        id: expect.any(String),
        playlist_id: playlistId,
        media_id: mediaId,
        position: 1,
      });

      const db = getDb();
      const [row] =
        await db`SELECT * FROM playlist_items WHERE id = ${body.id}`;
      expect(row).toMatchObject({
        playlist_id: playlistId,
        media_id: mediaId,
        position: 1,
      });
    });

    it("appends a second item at position 2 when no explicit position is given", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      await createItem(user, playlistId, mediaId);
      const media2 = await seedMediaRecord(user.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlistId, media_id: media2.id },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).position).toBe(2);
    });

    it("shifts the existing item at the requested position", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const first = await createItem(user, playlistId, mediaId);
      const media2 = await seedMediaRecord(user.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlistId, media_id: media2.id, position: 1 },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).position).toBe(1);

      const db = getDb();
      const [shifted] =
        await db`SELECT * FROM playlist_items WHERE id = ${first.id}`;
      expect(shifted).toMatchObject({ position: 2 });
    });

    it("returns 400 when the media is already in the playlist", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      await createItem(user, playlistId, mediaId);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlistId, media_id: mediaId },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistItemAlreadyExistsError",
      });
    });

    it("returns 400 when the requested position is out of bounds", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlistId, media_id: mediaId, position: 2 },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistItemPositionError",
      });
    });

    it("returns 404 when the playlist does not exist", async () => {
      const user = await registerUser(app, "no-playlist@test.com");
      const media = await seedMediaRecord(user.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: randomUUID(), media_id: media.id },
      });

      // PlaylistForCreatePlaylistNotFoundError sets this.name to the wrong
      // string (copy-paste bug in playlist-item.errors.ts), so the `error`
      // field in the response is mislabeled even though the `message` is
      // correct. Asserting both documents the actual contract precisely.
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "MediaItemForCreatePlaylistNotFoundError",
        message: "Playlist not found",
      });
    });

    it("returns 404 when the playlist belongs to a different user", async () => {
      const owner = await registerUser(app, "item-cross-owner@test.com");
      const other = await registerUser(app, "item-cross-other@test.com");
      const playlist = await createPlaylist(app, owner, "Party Time");
      const media = await seedMediaRecord(owner.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: other.authHeader },
        payload: { playlist_id: playlist.id, media_id: media.id },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "MediaItemForCreatePlaylistNotFoundError",
        message: "Playlist not found",
      });
    });

    it("returns 404 when the media does not exist", async () => {
      const user = await registerUser(app, "no-media@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlist.id, media_id: randomUUID() },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "MediaItemForCreatePlaylistNotFoundError",
      });
    });

    // Documents current behavior: PlaylistItemUsecase looks up media by id
    // only (IMediaStorage.getById has no owner filter), so any existing
    // media can be attached to the caller's own playlist regardless of who
    // uploaded it.
    it("allows attaching another user's media to the caller's own playlist", async () => {
      const mediaOwner = await registerUser(app, "media-owner@test.com");
      const playlistOwner = await registerUser(app, "playlist-owner@test.com");
      const playlist = await createPlaylist(app, playlistOwner, "Party Time");
      const media = await seedMediaRecord(mediaOwner.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: playlistOwner.authHeader },
        payload: { playlist_id: playlist.id, media_id: media.id },
      });

      expect(res.statusCode).toBe(201);
    });

    it("returns 400 when playlist_id is missing", async () => {
      const user = await registerUser(app, "missing-playlist-id@test.com");
      const media = await seedMediaRecord(user.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { media_id: media.id },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a malformed media_id", async () => {
      const user = await registerUser(app, "bad-media-id@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlist.id, media_id: "not-a-uuid" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a position below 1", async () => {
      const user = await registerUser(app, "position-zero@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");
      const media = await seedMediaRecord(user.user_id);

      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlist.id, media_id: media.id, position: 0 },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/playlist-items",
        payload: { playlist_id: randomUUID(), media_id: randomUUID() },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /playlist-items/:id ──────────────────────────────────────────────

  describe("GET /playlist-items/:id", () => {
    it("returns the item when the caller owns its playlist", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item = await createItem(user, playlistId, mediaId);

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({
        id: item.id,
        playlist_id: playlistId,
      });
    });

    it("returns 404 for an item id that does not exist", async () => {
      const user = await registerUser(app, "item-not-found@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${randomUUID()}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistItemNotFoundError",
      });
    });

    it("returns 404 for an item belonging to a different user's playlist", async () => {
      const {
        user: owner,
        playlistId,
        mediaId,
      } = await setupPlaylistWithMedia();
      const item = await createItem(owner, playlistId, mediaId);
      const other = await registerUser(app, "item-get-other@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 400 for a malformed item id", async () => {
      const user = await registerUser(app, "item-bad-id@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/playlist-items/not-a-uuid",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${randomUUID()}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /playlist-items/:id/items ────────────────────────────────────────

  describe("GET /playlist-items/:id/items", () => {
    it("returns an empty page for a playlist with no items", async () => {
      const user = await registerUser(app, "items-empty@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${playlist.id}/items`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    });

    it("returns items ordered by position", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item1 = await createItem(user, playlistId, mediaId);
      const media2 = await seedMediaRecord(user.user_id);
      const item2 = await createItem(user, playlistId, media2.id);

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${playlistId}/items`,
        headers: { authorization: user.authHeader },
      });

      const body = JSON.parse(res.body);
      expect(body.total).toBe(2);
      expect(body.items.map((i: { id: string }) => i.id)).toEqual([
        item1.id,
        item2.id,
      ]);
    });

    it("returns 404 when the playlist does not exist", async () => {
      const user = await registerUser(app, "items-no-playlist@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${randomUUID()}/items`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistNotFoundError",
      });
    });

    it("returns 404 when the playlist belongs to a different user", async () => {
      const owner = await registerUser(app, "items-cross-owner@test.com");
      const other = await registerUser(app, "items-cross-other@test.com");
      const playlist = await createPlaylist(app, owner, "Party Time");

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${playlist.id}/items`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 400 for an invalid limit", async () => {
      const user = await registerUser(app, "items-bad-limit@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${playlist.id}/items?limit=0`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a malformed playlist id", async () => {
      const user = await registerUser(app, "items-bad-id@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/playlist-items/not-a-uuid/items",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/playlist-items/${randomUUID()}/items`,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /playlist-items/:id ────────────────────────────────────────────

  describe("PATCH /playlist-items/:id", () => {
    // NOTE: PlaylistItemUsecase.updatePlaylistItem shifts siblings with
    // decrementPosition when moving to a *lower* position number, which is
    // backwards (it should increment them to make room) and produces
    // position 0 / duplicate positions instead of a clean reorder. This test
    // pins down the actual (buggy) persisted state rather than the
    // conceptually "correct" reorder, so a real fix shows up as a deliberate
    // test change instead of a silent regression.
    it("moves an item to a lower position (documents the current sibling-shift bug)", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item1 = await createItem(user, playlistId, mediaId); // position 1
      const media2 = await seedMediaRecord(user.user_id);
      const item2 = await createItem(user, playlistId, media2.id); // position 2
      const media3 = await seedMediaRecord(user.user_id);
      const item3 = await createItem(user, playlistId, media3.id); // position 3

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${item3.id}`,
        headers: { authorization: user.authHeader },
        payload: { id: item3.id, position: 1 },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ id: item3.id, position: 1 });

      const db = getDb();
      const [row1] =
        await db`SELECT * FROM playlist_items WHERE id = ${item1.id}`;
      const [row2] =
        await db`SELECT * FROM playlist_items WHERE id = ${item2.id}`;
      expect(row1).toMatchObject({ position: 0 });
      expect(row2).toMatchObject({ position: 1 });
    });

    // NOTE: incrementPosition's range includes `toPosition + 1`, so moving
    // to a higher position leaves a gap instead of a contiguous reorder.
    // Same rationale as above: pin the actual behavior.
    it("moves an item to a higher position (documents the current sibling-shift gap)", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item1 = await createItem(user, playlistId, mediaId); // position 1
      const media2 = await seedMediaRecord(user.user_id);
      const item2 = await createItem(user, playlistId, media2.id); // position 2

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${item1.id}`,
        headers: { authorization: user.authHeader },
        payload: { id: item1.id, position: 2 },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ id: item1.id, position: 2 });

      const db = getDb();
      const [row2] =
        await db`SELECT * FROM playlist_items WHERE id = ${item2.id}`;
      expect(row2).toMatchObject({ position: 3 });
    });

    // The request schema requires a body `id`, but the handler only ever
    // uses the id from the URL param — the body value is validated but
    // otherwise ignored. This locks in that documented quirk.
    it("ignores the body id and updates the item identified by the URL param", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item = await createItem(user, playlistId, mediaId);

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: user.authHeader },
        payload: { id: randomUUID(), position: 1 },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).id).toBe(item.id);
    });

    it("returns 404 for an item id that does not exist", async () => {
      const user = await registerUser(app, "patch-item-missing@test.com");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${randomUUID()}`,
        headers: { authorization: user.authHeader },
        payload: { id: randomUUID(), position: 1 },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistItemNotFoundError",
      });
    });

    it("returns 404 for an item belonging to a different user's playlist", async () => {
      const {
        user: owner,
        playlistId,
        mediaId,
      } = await setupPlaylistWithMedia();
      const item = await createItem(owner, playlistId, mediaId);
      const other = await registerUser(app, "patch-item-other@test.com");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: other.authHeader },
        payload: { id: item.id, position: 1 },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 400 when position is missing", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item = await createItem(user, playlistId, mediaId);

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: user.authHeader },
        payload: { id: item.id },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a position below 1", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item = await createItem(user, playlistId, mediaId);

      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: user.authHeader },
        payload: { id: item.id, position: 0 },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a malformed item id in the URL", async () => {
      const user = await registerUser(app, "patch-bad-url-id@test.com");

      const res = await app.inject({
        method: "PATCH",
        url: "/playlist-items/not-a-uuid",
        headers: { authorization: user.authHeader },
        payload: { id: randomUUID(), position: 1 },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/playlist-items/${randomUUID()}`,
        payload: { id: randomUUID(), position: 1 },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── DELETE /playlist-items/:id ───────────────────────────────────────────

  describe("DELETE /playlist-items/:id", () => {
    it("deletes the item and decrements positions of items after it", async () => {
      const { user, playlistId, mediaId } = await setupPlaylistWithMedia();
      const item1 = await createItem(user, playlistId, mediaId); // position 1
      const media2 = await seedMediaRecord(user.user_id);
      const item2 = await createItem(user, playlistId, media2.id); // position 2
      const media3 = await seedMediaRecord(user.user_id);
      const item3 = await createItem(user, playlistId, media3.id); // position 3

      const res = await app.inject({
        method: "DELETE",
        url: `/playlist-items/${item1.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe("");

      const db = getDb();
      const rows =
        await db`SELECT * FROM playlist_items WHERE id = ${item1.id}`;
      expect(rows).toHaveLength(0);

      const [row2] =
        await db`SELECT * FROM playlist_items WHERE id = ${item2.id}`;
      const [row3] =
        await db`SELECT * FROM playlist_items WHERE id = ${item3.id}`;
      expect(row2).toMatchObject({ position: 1 });
      expect(row3).toMatchObject({ position: 2 });
    });

    it("returns 404 for an item id that does not exist", async () => {
      const user = await registerUser(app, "delete-item-missing@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: `/playlist-items/${randomUUID()}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistItemNotFoundError",
      });
    });

    it("returns 404 for an item belonging to a different user's playlist", async () => {
      const {
        user: owner,
        playlistId,
        mediaId,
      } = await setupPlaylistWithMedia();
      const item = await createItem(owner, playlistId, mediaId);
      const other = await registerUser(app, "delete-item-other@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: `/playlist-items/${item.id}`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(404);

      const db = getDb();
      const rows = await db`SELECT * FROM playlist_items WHERE id = ${item.id}`;
      expect(rows).toHaveLength(1);
    });

    it("returns 400 for a malformed item id", async () => {
      const user = await registerUser(app, "delete-item-bad-id@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: "/playlist-items/not-a-uuid",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/playlist-items/${randomUUID()}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
