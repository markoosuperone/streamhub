import fs from "node:fs/promises";
import path from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { getDb } from "@/shared/db/postgres.ts";
import {
  buildMultipartBody,
  buildMultipartBodyWithoutFile,
  cleanDb,
  createTestApp,
  registerUser,
  seedMediaRecord,
  seedMediaWithFile,
  teardown,
  uniqueIp,
  type AuthResult,
} from "@/tests/integration/setup.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────
// chunk.bin is a real (tiny) MP3 file checked into the repo root; using real
// bytes lets FileService's magic-byte sniffing and ffprobe run for real.

let audioFixture: Buffer;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Media routes", () => {
  let app: FastifyInstance;
  const cleanupDirs: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    audioFixture = await fs.readFile(path.join(process.cwd(), "chunk.bin"));
  });

  afterAll(async () => {
    await teardown(app);
  });

  beforeEach(async () => {
    await cleanDb();
  });

  afterEach(async () => {
    await Promise.all(
      cleanupDirs
        .splice(0)
        .map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  async function uploadAudio(
    user: AuthResult,
    filename = "clip.mp3",
  ): Promise<{ statusCode: number; body: string }> {
    const { body, contentType } = buildMultipartBody({
      filename,
      contentType: "audio/mpeg",
      content: audioFixture,
    });
    const res = await app.inject({
      method: "POST",
      url: "/media/upload",
      headers: { authorization: user.authHeader, "content-type": contentType },
      payload: body,
      remoteAddress: uniqueIp(),
    });
    if (res.statusCode === 201) {
      const media = JSON.parse(res.body) as { file_path: string };
      cleanupDirs.push(path.dirname(media.file_path));
    }
    return res;
  }

  // ── POST /media/upload ───────────────────────────────────────────────────

  describe("POST /media/upload", () => {
    it("stores the file and creates a media record", async () => {
      const user = await registerUser(app, "uploader@test.com");

      const res = await uploadAudio(user);

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({
        id: expect.any(String),
        owner_id: user.user_id,
        media_type: "audio",
        mime_type: "audio/mpeg",
        title: "clip.mp3",
        size_bytes: String(audioFixture.length),
      });
      expect(typeof body.duration_seconds).toBe("number");

      const db = getDb();
      const [row] = await db`SELECT * FROM media_items WHERE id = ${body.id}`;
      expect(row).toMatchObject({
        owner_id: user.user_id,
        mime_type: "audio/mpeg",
      });

      const stat = await fs.stat(body.file_path);
      expect(stat.isFile()).toBe(true);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const { body, contentType } = buildMultipartBody({
        filename: "clip.mp3",
        contentType: "audio/mpeg",
        content: audioFixture,
      });

      const res = await app.inject({
        method: "POST",
        url: "/media/upload",
        headers: { "content-type": contentType },
        payload: body,
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "UnauthorizedError",
      });
    });

    it("returns 400 when the multipart payload has no file part", async () => {
      const user = await registerUser(app, "nofile@test.com");
      const { body, contentType } = buildMultipartBodyWithoutFile();

      const res = await app.inject({
        method: "POST",
        url: "/media/upload",
        headers: {
          authorization: user.authHeader,
          "content-type": contentType,
        },
        payload: body,
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "FileNotFoundError",
      });
    });

    it("returns 400 for a file whose content does not match a supported media type", async () => {
      const user = await registerUser(app, "badtype@test.com");
      const { body, contentType } = buildMultipartBody({
        filename: "note.txt",
        contentType: "text/plain",
        content: Buffer.from("plain text is not a media file"),
      });

      const res = await app.inject({
        method: "POST",
        url: "/media/upload",
        headers: {
          authorization: user.authHeader,
          "content-type": contentType,
        },
        payload: body,
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "UnsupportedFileTypeError",
      });

      const db = getDb();
      const rows =
        await db`SELECT * FROM media_items WHERE owner_id = ${user.user_id}`;
      expect(rows).toHaveLength(0);
    });
  });

  // ── GET /media ───────────────────────────────────────────────────────────

  describe("GET /media", () => {
    it("returns an empty page when there is no media", async () => {
      const user = await registerUser(app, "empty-list@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/media",
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

    it("lists media across all owners (library is shared, not per-user)", async () => {
      const owner = await registerUser(app, "list-owner@test.com");
      const other = await registerUser(app, "list-other@test.com");
      await seedMediaRecord(owner.user_id);
      await seedMediaRecord(other.user_id);

      const res = await app.inject({
        method: "GET",
        url: "/media",
        headers: { authorization: owner.authHeader },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBe(2);
      expect(body.items).toHaveLength(2);
    });

    it("respects limit and offset", async () => {
      const user = await registerUser(app, "paginated@test.com");
      await seedMediaRecord(user.user_id, { id: randomUUID() });
      await seedMediaRecord(user.user_id, { id: randomUUID() });
      await seedMediaRecord(user.user_id, { id: randomUUID() });

      const page1 = await app.inject({
        method: "GET",
        url: "/media?limit=2&offset=0",
        headers: { authorization: user.authHeader },
      });
      const page2 = await app.inject({
        method: "GET",
        url: "/media?limit=2&offset=2",
        headers: { authorization: user.authHeader },
      });

      expect(JSON.parse(page1.body)).toMatchObject({
        total: 3,
        limit: 2,
        offset: 0,
      });
      expect(JSON.parse(page1.body).items).toHaveLength(2);
      expect(JSON.parse(page2.body)).toMatchObject({
        total: 3,
        limit: 2,
        offset: 2,
      });
      expect(JSON.parse(page2.body).items).toHaveLength(1);
    });

    it.each([
      ["limit=0", "/media?limit=0"],
      ["limit=101", "/media?limit=101"],
      ["offset=-1", "/media?offset=-1"],
      ["limit=abc", "/media?limit=abc"],
    ])("returns 400 for invalid query parameter %s", async (_name, url) => {
      const user = await registerUser(
        app,
        `bad-query-${randomUUID()}@test.com`,
      );

      const res = await app.inject({
        method: "GET",
        url,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({ method: "GET", url: "/media" });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /media/:mediaId ──────────────────────────────────────────────────

  describe("GET /media/:mediaId", () => {
    it("streams the full file with correct headers", async () => {
      const user = await registerUser(app, "stream-owner@test.com");
      const media = await seedMediaWithFile(
        user.user_id,
        "hello-world-content",
      );
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "GET",
        url: `/media/${media.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("video/mp4");
      expect(res.headers["content-length"]).toBe(
        "hello-world-content".length.toString(),
      );
      expect(res.headers["accept-ranges"]).toBe("bytes");
      expect(res.body).toBe("hello-world-content");
    });

    it("streams a partial range with 206 and Content-Range", async () => {
      const user = await registerUser(app, "range-owner@test.com");
      const media = await seedMediaWithFile(user.user_id, "0123456789");
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "GET",
        url: `/media/${media.id}`,
        headers: { authorization: user.authHeader, range: "bytes=0-3" },
      });

      expect(res.statusCode).toBe(206);
      expect(res.headers["content-range"]).toBe("bytes 0-3/10");
      expect(res.headers["content-length"]).toBe("4");
      expect(res.body).toBe("0123");
    });

    it("returns 416 when the range is beyond the file size", async () => {
      const user = await registerUser(app, "range-oob@test.com");
      const media = await seedMediaWithFile(user.user_id, "0123456789");
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "GET",
        url: `/media/${media.id}`,
        headers: { authorization: user.authHeader, range: "bytes=9999-10000" },
      });

      expect(res.statusCode).toBe(416);
      expect(res.headers["content-range"]).toBe("bytes */10");
      expect(JSON.parse(res.body)).toMatchObject({
        error: "RangeNotSatisfiableError",
      });
    });

    it("returns 400 for a malformed Range header", async () => {
      const user = await registerUser(app, "range-bad@test.com");
      const media = await seedMediaWithFile(user.user_id, "0123456789");
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "GET",
        url: `/media/${media.id}`,
        headers: { authorization: user.authHeader, range: "not-a-range" },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidRangeFormatError",
      });
    });

    it("returns 404 for a media id that does not exist", async () => {
      const user = await registerUser(app, "not-found-media@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/media/${randomUUID()}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "MediaNotFoundError",
      });
    });

    it("returns 400 for a malformed media id", async () => {
      const user = await registerUser(app, "bad-id-media@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/media/not-a-uuid",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/media/${randomUUID()}`,
      });
      expect(res.statusCode).toBe(401);
    });

    // Documents current behavior: MediaUsecase.execute() does not check the
    // caller against media.owner_id, so any authenticated user can stream
    // any media record. This locks the contract so a future authz change is
    // a deliberate, visible test update rather than a silent regression.
    it("allows a different authenticated user to stream someone else's media (no ownership check)", async () => {
      const owner = await registerUser(app, "cross-owner@test.com");
      const other = await registerUser(app, "cross-other@test.com");
      const media = await seedMediaWithFile(owner.user_id, "owned-by-owner");
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "GET",
        url: `/media/${media.id}`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toBe("owned-by-owner");
    });
  });

  // ── DELETE /media/:mediaId ───────────────────────────────────────────────

  describe("DELETE /media/:mediaId", () => {
    it("deletes the DB record and the underlying file", async () => {
      const user = await registerUser(app, "delete-owner@test.com");
      const media = await seedMediaWithFile(user.user_id);
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "DELETE",
        url: `/media/${media.id}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe("");

      const db = getDb();
      const rows = await db`SELECT * FROM media_items WHERE id = ${media.id}`;
      expect(rows).toHaveLength(0);

      await expect(fs.stat(media.absoluteFilePath)).rejects.toThrow();
    });

    it("returns 404 for a media id that does not exist", async () => {
      const user = await registerUser(app, "delete-missing@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: `/media/${randomUUID()}`,
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "MediaNotFoundError",
      });
    });

    it("returns 400 for a malformed media id", async () => {
      const user = await registerUser(app, "delete-bad-id@test.com");

      const res = await app.inject({
        method: "DELETE",
        url: "/media/not-a-uuid",
        headers: { authorization: user.authHeader },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/media/${randomUUID()}`,
      });
      expect(res.statusCode).toBe(401);
    });

    // Same documented gap as GET /media/:mediaId: delete is not restricted
    // to the owner.
    it("allows a different authenticated user to delete someone else's media (no ownership check)", async () => {
      const owner = await registerUser(app, "cross-delete-owner@test.com");
      const other = await registerUser(app, "cross-delete-other@test.com");
      const media = await seedMediaWithFile(owner.user_id);
      cleanupDirs.push(path.dirname(media.absoluteFilePath));

      const res = await app.inject({
        method: "DELETE",
        url: `/media/${media.id}`,
        headers: { authorization: other.authHeader },
      });

      expect(res.statusCode).toBe(204);
      const db = getDb();
      const rows = await db`SELECT * FROM media_items WHERE id = ${media.id}`;
      expect(rows).toHaveLength(0);
    });
  });
});
