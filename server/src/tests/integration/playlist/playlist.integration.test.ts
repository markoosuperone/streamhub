import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { getDb } from "@/shared/db/postgres.ts";
import {
  cleanDb,
  createPlaylist,
  createTestApp,
  registerUser,
  seedMediaRecord,
  teardown,
} from "@/tests/integration/setup.ts";

// ── Tests ─────────────────────────────────────────────────────────────────────
// Titles in fixtures deliberately avoid the letter "s": normalizeTitle()
// (src/shared/utility/normalizeTitle.ts) uses the regex /s+/g instead of
// /\s+/g, which strips literal "s" characters rather than collapsing
// whitespace. Using "s"-free titles keeps assertions decoupled from that bug.

describe("Playlist routes", () => {
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

  // ── POST /playlists ──────────────────────────────────────────────────────

  describe("POST /playlists", () => {
    it("creates a playlist owned by the caller", async () => {
      const user = await registerUser(app, "create-playlist@test.com");

      const res = await app.inject({
        method: "POST",
        url: "/playlists",
        headers: { authorization: user.authHeader },
        payload: { title: "Party Time" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({
        id: expect.any(String),
        owner_id: user.user_id,
        title: "Party Time",
      });

      const db = getDb();
      const [row] = await db`SELECT * FROM playlists WHERE id = ${body.id}`;
      expect(row).toMatchObject({
        owner_id: user.user_id,
        title: "Party Time",
      });
    });

    it("trims surrounding whitespace from the title", async () => {
      const user = await registerUser(app, "trim-title@test.com");

      const res = await app.inject({
        method: "POST",
        url: "/playlists",
        headers: { authorization: user.authHeader },
        payload: { title: "  Road Trip  " },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).title).toBe("Road Trip");
    });

    it("returns 400 for an empty title", async () => {
      const user = await registerUser(app, "empty-title@test.com");

      const res = await app.inject({
        method: "POST",
        url: "/playlists",
        headers: { authorization: user.authHeader },
        payload: { title: "" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a whitespace-only title", async () => {
      const user = await registerUser(app, "whitespace-title@test.com");

      const res = await app.inject({
        method: "POST",
        url: "/playlists",
        headers: { authorization: user.authHeader },
        payload: { title: "   " },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidPlaylistTitleError",
      });
    });

    it("returns 400 when title is missing", async () => {
      const user = await registerUser(app, "missing-title@test.com");

      const res = await app.inject({
        method: "POST",
        url: "/playlists",
        headers: { authorization: user.authHeader },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/playlists",
        payload: { title: "Party Time" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /playlists/:id ───────────────────────────────────────────────────

  describe("GET /playlists/:id", () => {
    it("returns the caller's playlist", async () => {
      const user = await registerUser(app, "get-owner@test.com");
      const playlist = await createPlaylist(app, user, "Weekend Mix");

      const res = await app.inject({
        method: "GET",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({
        id: playlist.id,
        owner_id: user.user_id,
        title: "Weekend Mix",
      });
    });

    it("returns 404 for a playlist id that does not exist", async () => {
      const user = await registerUser(app, "get-missing@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/playlists/${randomUUID()}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistNotFoundError",
      });
    });

    it("returns 404 for a playlist owned by a different user", async () => {
      const owner = await registerUser(app, "get-cross-owner@test.com");
      const other = await registerUser(app, "get-cross-other@test.com");
      const playlist = await createPlaylist(app, owner, "Chill Zone");

      const res = await app.inject({
        method: "GET",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "PlaylistNotFoundError",
      });
    });

    it("returns 400 for a malformed playlist id", async () => {
      const user = await registerUser(app, "get-bad-id@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/playlists/not-a-uuid",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/playlists/${randomUUID()}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /playlists ───────────────────────────────────────────────────────

  describe("GET /playlists", () => {
    it("returns an empty page when the caller has no playlists", async () => {
      const user = await registerUser(app, "empty-playlists@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/playlists",
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

    it("only returns playlists owned by the caller", async () => {
      const owner = await registerUser(app, "list-owner@test.com");
      const other = await registerUser(app, "list-other@test.com");
      await createPlaylist(app, owner, "Party Time");
      await createPlaylist(app, other, "Road Trip");

      const res = await app.inject({
        method: "GET",
        url: "/playlists",
        headers: { authorization: owner.authHeader },
      });

      const body = JSON.parse(res.body);
      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toMatchObject({
        title: "Party Time",
        owner_id: owner.user_id,
      });
    });

    it("respects limit and offset", async () => {
      const user = await registerUser(app, "paginated-playlists@test.com");
      await createPlaylist(app, user, "Party Time");
      await createPlaylist(app, user, "Road Trip");
      await createPlaylist(app, user, "Weekend Mix");

      const res = await app.inject({
        method: "GET",
        url: "/playlists?limit=2&offset=1",
        headers: { authorization: user.authHeader },
      });

      const body = JSON.parse(res.body);
      expect(body).toMatchObject({ total: 3, limit: 2, offset: 1 });
      expect(body.items).toHaveLength(2);
    });

    it("returns 400 for an out-of-range limit", async () => {
      const user = await registerUser(app, "bad-limit-playlists@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/playlists?limit=0",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a negative offset", async () => {
      const user = await registerUser(app, "bad-offset-playlists@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/playlists?offset=-1",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({ method: "GET", url: "/playlists" });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /playlists/:id ─────────────────────────────────────────────────

  describe("PATCH /playlists/:id", () => {
    it("updates the title of the caller's playlist", async () => {
      const user = await registerUser(app, "patch-owner@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: user.authHeader },
        payload: { title: "Updated Title" },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({
        id: playlist.id,
        title: "Updated Title",
      });

      const db = getDb();
      const [row] = await db`SELECT * FROM playlists WHERE id = ${playlist.id}`;
      expect(row).toMatchObject({ title: "Updated Title" });
    });

    it("returns 404 for a playlist id that does not exist", async () => {
      const user = await registerUser(app, "patch-missing@test.com");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlists/${randomUUID()}`,
        headers: { authorization: user.authHeader },
        payload: { title: "Updated Title" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when updating a playlist owned by a different user", async () => {
      const owner = await registerUser(app, "patch-cross-owner@test.com");
      const other = await registerUser(app, "patch-cross-other@test.com");
      const playlist = await createPlaylist(app, owner, "Party Time");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: other.authHeader },
        payload: { title: "Hijacked" },
      });

      expect(res.statusCode).toBe(404);

      const db = getDb();
      const [row] = await db`SELECT * FROM playlists WHERE id = ${playlist.id}`;
      expect(row).toMatchObject({ title: "Party Time" });
    });

    it("returns 400 for an empty title", async () => {
      const user = await registerUser(app, "patch-empty-title@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: user.authHeader },
        payload: { title: "" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a whitespace-only title", async () => {
      const user = await registerUser(app, "patch-whitespace-title@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "PATCH",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: user.authHeader },
        payload: { title: "   " },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidPlaylistTitleError",
      });
    });

    it("returns 400 for a malformed playlist id", async () => {
      const user = await registerUser(app, "patch-bad-id@test.com");

      const res = await app.inject({
        method: "PATCH",
        url: "/playlists/not-a-uuid",
        headers: { authorization: user.authHeader },
        payload: { title: "Updated Title" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/playlists/${randomUUID()}`,
        payload: { title: "Updated Title" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── DELETE /playlists/:id ────────────────────────────────────────────────

  describe("DELETE /playlists/:id", () => {
    it("deletes the caller's playlist", async () => {
      const user = await registerUser(app, "delete-owner@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");

      const res = await app.inject({
        method: "DELETE",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe("");

      const db = getDb();
      const rows = await db`SELECT * FROM playlists WHERE id = ${playlist.id}`;
      expect(rows).toHaveLength(0);
    });

    it("cascades to delete the playlist's items", async () => {
      const user = await registerUser(app, "delete-cascade@test.com");
      const playlist = await createPlaylist(app, user, "Party Time");
      const media = await seedMediaRecord(user.user_id);
      await app.inject({
        method: "POST",
        url: "/playlist-items",
        headers: { authorization: user.authHeader },
        payload: { playlist_id: playlist.id, media_id: media.id },
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(204);

      const db = getDb();
      const items =
        await db`SELECT * FROM playlist_items WHERE playlist_id = ${playlist.id}`;
      expect(items).toHaveLength(0);
    });

    it("returns 404 for a playlist id that does not exist", async () => {
      const user = await registerUser(app, "delete-missing@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: `/playlists/${randomUUID()}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when deleting a playlist owned by a different user", async () => {
      const owner = await registerUser(app, "delete-cross-owner@test.com");
      const other = await registerUser(app, "delete-cross-other@test.com");
      const playlist = await createPlaylist(app, owner, "Party Time");

      const res = await app.inject({
        method: "DELETE",
        url: `/playlists/${playlist.id}`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(404);

      const db = getDb();
      const rows = await db`SELECT * FROM playlists WHERE id = ${playlist.id}`;
      expect(rows).toHaveLength(1);
    });

    it("returns 400 for a malformed playlist id", async () => {
      const user = await registerUser(app, "delete-bad-id@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: "/playlists/not-a-uuid",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/playlists/${randomUUID()}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
