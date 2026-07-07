import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "@/app.ts";
import { buildContainer } from "@/container.ts";
import { closeDbConnection, getDb } from "@/shared/db/postgres.ts";

export async function createTestApp(): Promise<FastifyInstance> {
  const container = buildContainer();
  return buildApp(container);
}

export async function teardown(app: FastifyInstance): Promise<void> {
  await app.close();
  await closeDbConnection();
}

export async function cleanDb(): Promise<void> {
  const db = getDb();
  await db.unsafe(
    "TRUNCATE TABLE playlist_items, playlists, sessions, media_items, users CASCADE",
  );
}

export type AuthResult = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  authHeader: string;
};

// fastify-rate-limit buckets by request.ip; giving each rate-limited call its
// own remote address keeps tests independent of one another's call counts.
let ipCounter = 0;
export function uniqueIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

export function buildMultipartBody(input: {
  fieldName?: string;
  filename?: string;
  contentType?: string;
  content: Buffer | string;
}): { body: Buffer; contentType: string } {
  const boundary = `testBoundary${randomUUID()}`;
  const fieldName = input.fieldName ?? "file";
  const content = Buffer.isBuffer(input.content)
    ? input.content
    : Buffer.from(input.content);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${
      input.filename ?? "upload.bin"
    }"\r\nContent-Type: ${input.contentType ?? "application/octet-stream"}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, content, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

// Builds a multipart body with a single non-file text field, so
// request.file() resolves to undefined (used to exercise the "no file" path).
export function buildMultipartBodyWithoutFile(): {
  body: Buffer;
  contentType: string;
} {
  const boundary = `testBoundary${randomUUID()}`;
  const body = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello\r\n--${boundary}--\r\n`,
  );
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

export async function registerUser(
  app: FastifyInstance,
  email: string,
  password = "password123",
): Promise<AuthResult> {
  const res = await app.inject({
    method: "POST",
    url: "/register",
    payload: { email, password },
    remoteAddress: uniqueIp(),
  });
  if (res.statusCode !== 201) {
    throw new Error(`registerUser failed [${res.statusCode}]: ${res.body}`);
  }
  const b = JSON.parse(res.body) as {
    user: { user_id: string };
    access_token: string;
    refresh_token: string;
  };
  return {
    user_id: b.user.user_id,
    access_token: b.access_token,
    refresh_token: b.refresh_token,
    authHeader: `Bearer ${b.access_token}`,
  };
}

export async function createPlaylist(
  app: FastifyInstance,
  user: AuthResult,
  title: string,
): Promise<{ id: string; owner_id: string; title: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/playlists",
    headers: { authorization: user.authHeader },
    payload: { title },
  });
  if (res.statusCode !== 201) {
    throw new Error(`createPlaylist failed [${res.statusCode}]: ${res.body}`);
  }
  return JSON.parse(res.body) as {
    id: string;
    owner_id: string;
    title: string;
  };
}

// Seeds a media DB record without touching the filesystem.
// Use for tests that don't exercise FileService (playlist-item lookups, media list, etc.).
export async function seedMediaRecord(
  userId: string,
  overrides: { id?: string; file_path?: string; title?: string } = {},
): Promise<{
  id: string;
  owner_id: string;
  file_path: string;
  title: string;
  mime_type: string;
}> {
  const db = getDb();
  const id = overrides.id ?? randomUUID();
  const file_path = overrides.file_path ?? `${userId}/${id}/test.mp4`;
  const title = overrides.title ?? "Test Video";
  const [media] = await db<
    {
      id: string;
      owner_id: string;
      file_path: string;
      title: string;
      mime_type: string;
    }[]
  >`
    INSERT INTO media_items (id, owner_id, media_type, file_path, mime_type, size_bytes, duration_seconds, title)
    VALUES (${id}, ${userId}, 'video', ${file_path}, 'video/mp4', 1024, 60.0, ${title})
    RETURNING id, owner_id, file_path, title, mime_type
  `;
  if (!media) throw new Error("seedMediaRecord: insert returned nothing");
  return media;
}

// Creates a real file inside storage/ and seeds the matching DB record.
// Required for tests that call FileService.deleteFile or createReadStreamWithRange.
export async function seedMediaWithFile(
  userId: string,
  content = "integration-test-payload",
): Promise<{
  id: string;
  owner_id: string;
  file_path: string;
  title: string;
  mime_type: string;
  absoluteFilePath: string;
}> {
  const id = randomUUID();
  const storageDir = path.join(process.cwd(), "storage", userId, id);
  await fs.mkdir(storageDir, { recursive: true });
  const absoluteFilePath = path.join(storageDir, "test.mp4");
  await fs.writeFile(absoluteFilePath, content);

  const db = getDb();
  const [media] = await db<
    {
      id: string;
      owner_id: string;
      file_path: string;
      title: string;
      mime_type: string;
    }[]
  >`
    INSERT INTO media_items (id, owner_id, media_type, file_path, mime_type, size_bytes, duration_seconds, title)
    VALUES (${id}, ${userId}, 'video', ${absoluteFilePath}, 'video/mp4', ${content.length}, 0.0, 'File Test Video')
    RETURNING id, owner_id, file_path, title, mime_type
  `;
  if (!media) throw new Error("seedMediaWithFile: insert returned nothing");
  return { ...media, absoluteFilePath };
}
