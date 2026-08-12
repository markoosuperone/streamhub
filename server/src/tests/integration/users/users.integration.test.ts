import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  cleanDb,
  createTestApp,
  registerUser,
  teardown,
} from "@/tests/integration/setup.ts";

describe("User routes", () => {
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

  // ── GET /me ─────────────────────────────────────────────────────────────

  describe("GET /me", () => {
    it("returns the calling user's profile", async () => {
      const user = await registerUser(app, "me@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/me",
        cookies: user.cookies,
        headers: user.headers,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        user_id: user.user_id,
        email: "me@test.com",
      });
    });

    it("returns 401 without an authorization header", async () => {
      const res = await app.inject({ method: "GET", url: "/me" });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /users ──────────────────────────────────────────────────────────

  describe("GET /users", () => {
    it("returns a paginated list of users", async () => {
      const first = await registerUser(app, "first@test.com");
      await registerUser(app, "second@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/users?limit=1&offset=0",
        cookies: first.cookies,
        headers: first.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as {
        items: { user_id: string; email: string }[];
        total: number;
        limit: number;
        offset: number;
      };
      expect(body.total).toBe(2);
      expect(body.items).toHaveLength(1);
      expect(body.limit).toBe(1);
      expect(body.offset).toBe(0);
    });

    it("does not leak password hashes", async () => {
      const user = await registerUser(app, "hash@test.com");

      const res = await app.inject({
        method: "GET",
        url: "/users",
        cookies: user.cookies,
        headers: user.headers,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).not.toContain("password_hash");
    });

    it("returns 401 without an authorization header", async () => {
      const res = await app.inject({ method: "GET", url: "/users" });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /users/:id ──────────────────────────────────────────────────────

  describe("GET /users/:id", () => {
    it("returns a user by id", async () => {
      const caller = await registerUser(app, "caller@test.com");
      const other = await registerUser(app, "other@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/users/${other.user_id}`,
        cookies: caller.cookies,
        headers: caller.headers,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        user_id: other.user_id,
        email: "other@test.com",
      });
    });

    it("returns 404 when the user does not exist", async () => {
      const caller = await registerUser(app, "caller404@test.com");

      const res = await app.inject({
        method: "GET",
        url: `/users/${randomUUID()}`,
        cookies: caller.cookies,
        headers: caller.headers,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
