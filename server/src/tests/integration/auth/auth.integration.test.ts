import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { getDb } from "@/shared/db/postgres.ts";
import {
  cleanDb,
  createTestApp,
  registerUser,
  teardown,
  uniqueIp,
} from "@/tests/integration/setup.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const PASSWORD = "password123";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Auth routes", () => {
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

  // ── POST /register ──────────────────────────────────────────────────────

  describe("POST /register", () => {
    it("creates a user and returns tokens without leaking the password hash", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { email: "new-user@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toEqual({
        user: { user_id: expect.any(String), email: "new-user@test.com" },
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        access_token_expires_at: expect.any(String),
        refresh_token_expires_at: expect.any(String),
      });
      expect(body).not.toHaveProperty("password_hash");
      expect(body.user).not.toHaveProperty("password_hash");

      const db = getDb();
      const [user] =
        await db`SELECT * FROM users WHERE email = ${"new-user@test.com"}`;
      expect(user).toMatchObject({
        id: body.user.user_id,
        email: "new-user@test.com",
      });

      const sessions =
        await db`SELECT * FROM sessions WHERE user_id = ${body.user.user_id}`;
      expect(sessions).toHaveLength(1);
    });

    it("returns 409 when the email is already registered", async () => {
      await registerUser(app, "duplicate@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { email: "duplicate@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body)).toMatchObject({
        statusCode: 409,
        error: "UserAlreadyExistsError",
      });

      const db = getDb();
      const users =
        await db`SELECT * FROM users WHERE email = ${"duplicate@test.com"}`;
      expect(users).toHaveLength(1);
    });

    it("returns 400 for an invalid email format", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { email: "not-an-email", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).statusCode).toBe(400);
    });

    it("returns 400 when password is shorter than 8 characters", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { email: "shortpass@test.com", password: "short" },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when email is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when password is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { email: "nopass@test.com" },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /login ──────────────────────────────────────────────────────────

  describe("POST /login", () => {
    it("returns tokens for valid credentials and persists a new session", async () => {
      await registerUser(app, "login-user@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "login-user@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user.email).toBe("login-user@test.com");
      expect(body.access_token).toEqual(expect.any(String));
      expect(body.refresh_token).toEqual(expect.any(String));

      const db = getDb();
      const sessions =
        await db`SELECT * FROM sessions WHERE user_id = ${body.user.user_id}`;
      // one session from registerUser, one from this login
      expect(sessions).toHaveLength(2);
    });

    it("returns 401 for a non-existent email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "nobody@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        statusCode: 401,
        error: "InvalidEmailOrPasswordError",
      });
    });

    it("returns 401 for an incorrect password", async () => {
      await registerUser(app, "wrongpass@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "wrongpass@test.com", password: "wrong-password" },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        statusCode: 401,
        error: "InvalidEmailOrPasswordError",
      });
    });

    it("returns 400 for an invalid email format", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "not-an-email", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when password is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "login-user@test.com" },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /refresh-token ──────────────────────────────────────────────────

  describe("POST /refresh-token", () => {
    it("issues a new token pair for a valid refresh token", async () => {
      const user = await registerUser(app, "refresh-user@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        payload: { refresh_token: user.refresh_token },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toEqual({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        access_token_expires_at: expect.any(String),
        refresh_token_expires_at: expect.any(String),
      });
    });

    it("returns 401 for a malformed refresh token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        payload: { refresh_token: "not-a-valid-jwt" },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        statusCode: 401,
        error: "InvalidRefreshTokenError",
      });
    });

    it("returns 400 when refresh_token is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 when reusing a refresh token that has already been rotated", async () => {
      const user = await registerUser(app, "rotate-user@test.com", PASSWORD);

      // jsonwebtoken issues tokens with second-precision `iat`; without this
      // gap the rotated token can be byte-identical to the original and the
      // reuse check would trivially pass.
      await sleep(1100);
      await app.inject({
        method: "POST",
        url: "/refresh-token",
        payload: { refresh_token: user.refresh_token },
      });

      const reuseRes = await app.inject({
        method: "POST",
        url: "/refresh-token",
        payload: { refresh_token: user.refresh_token },
      });

      expect(reuseRes.statusCode).toBe(401);
      expect(JSON.parse(reuseRes.body)).toMatchObject({
        error: "InvalidRefreshTokenError",
      });
    }, 10000);

    it("returns 401 for the refresh token of a session that was logged out", async () => {
      const user = await registerUser(app, "logout-refresh@test.com", PASSWORD);

      await app.inject({
        method: "POST",
        url: "/logout",
        headers: { authorization: user.authHeader },
        payload: { session_id: user.user_id },
      });

      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        payload: { refresh_token: user.refresh_token },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidRefreshTokenError",
      });
    });
  });

  // ── POST /logout ─────────────────────────────────────────────────────────

  describe("POST /logout", () => {
    it("deletes the caller's session and returns a confirmation message", async () => {
      const user = await registerUser(app, "logout-user@test.com", PASSWORD);
      const db = getDb();
      const sessionsBefore =
        await db`SELECT * FROM sessions WHERE user_id = ${user.user_id}`;
      expect(sessionsBefore).toHaveLength(1);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        headers: { authorization: user.authHeader },
        payload: { session_id: "unused-but-required-by-schema" },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        message: "Logged out successfully",
      });

      const sessionsAfter =
        await db`SELECT * FROM sessions WHERE user_id = ${user.user_id}`;
      expect(sessionsAfter).toHaveLength(0);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/logout",
        payload: { session_id: "some-session-id" },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "UnauthorizedError",
      });
    });

    it("returns 401 when the Authorization scheme is not Bearer", async () => {
      const user = await registerUser(app, "bad-scheme@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        headers: { authorization: `Basic ${user.access_token}` },
        payload: { session_id: "some-session-id" },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidAuthorizationHeaderError",
      });
    });

    it("returns 401 for a garbage access token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/logout",
        headers: { authorization: "Bearer garbage-token" },
        payload: { session_id: "some-session-id" },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidTokenError",
      });
    });

    it("returns 400 when session_id is missing from the body", async () => {
      const user = await registerUser(app, "missing-body@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        headers: { authorization: user.authHeader },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
