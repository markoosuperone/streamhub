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

// The secret lives in a cookie and the token is echoed in a header — a request
// forged by another origin can produce neither, which is the whole point.
async function getCsrf(
  app: FastifyInstance,
): Promise<{ secret: string; token: string }> {
  const res = await app.inject({ method: "GET", url: "/csrf-token" });
  return {
    secret: res.cookies.find((c) => c.name === "_csrf")?.value ?? "",
    token: JSON.parse(res.body).csrf_token,
  };
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
    it("returns only the user and never leaks the password hash", async () => {
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
      });
      // The credentials go to cookies, never to a body the browser can read.
      expect(
        res.cookies.find((c) => c.name === "access_token")?.value,
      ).toBeTruthy();
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
    it("returns the user for valid credentials and persists a new session", async () => {
      await registerUser(app, "login-user@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "login-user@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toEqual({
        user: { user_id: expect.any(String), email: "login-user@test.com" },
      });
      expect(
        res.cookies.find((c) => c.name === "access_token")?.value,
      ).toBeTruthy();

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
    it("rotates the pair into cookies and returns no body", async () => {
      const user = await registerUser(app, "refresh-user@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        cookies: { refresh_token: user.refresh_token },
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe("");
      expect(
        res.cookies.find((c) => c.name === "access_token")?.value,
      ).toBeTruthy();
      expect(
        res.cookies.find((c) => c.name === "refresh_token")?.value,
      ).toBeTruthy();
    });

    it("returns 401 for a malformed refresh token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        cookies: { refresh_token: "not-a-valid-jwt" },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        statusCode: 401,
        error: "InvalidRefreshTokenError",
      });
    });

    it("returns 401 when no refresh cookie is presented", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidRefreshTokenError",
      });
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
        cookies: { refresh_token: user.refresh_token },
      });

      const reuseRes = await app.inject({
        method: "POST",
        url: "/refresh-token",
        cookies: { refresh_token: user.refresh_token },
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
        cookies: user.cookies,
        headers: user.headers,
      });

      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        cookies: { refresh_token: user.refresh_token },
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
        cookies: user.cookies,
        headers: user.headers,
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

    it("ignores a bearer token — the header is no longer a credential", async () => {
      const user = await registerUser(app, "bearer-ignored@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        headers: { authorization: `Bearer ${user.access_token}` },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "UnauthorizedError",
      });
    });

    it("returns 401 for a garbage access-token cookie", async () => {
      // A CSRF token is supplied deliberately: the guard runs ahead of
      // authentication, so without one this would be rejected as a forgery
      // (403) and the token would never be looked at.
      const csrf = await getCsrf(app);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: { access_token: "garbage-token", _csrf: csrf.secret },
        headers: { "x-csrf-token": csrf.token },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        error: "InvalidTokenError",
      });
    });

    it("logs out without a request body — the session comes from the token", async () => {
      const user = await registerUser(app, "no-body-logout@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: user.cookies,
        headers: user.headers,
      });

      expect(res.statusCode).toBe(200);

      const db = getDb();
      const sessions =
        await db`SELECT * FROM sessions WHERE user_id = ${user.user_id}`;
      expect(sessions).toHaveLength(0);
    });
  });

  // ── Cookie authentication ────────────────────────────────────────────────

  describe("cookie authentication", () => {
    it("sets httpOnly auth cookies on register", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/register",
        payload: { email: "cookie-register@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(201);

      const accessCookie = res.cookies.find((c) => c.name === "access_token");
      const refreshCookie = res.cookies.find((c) => c.name === "refresh_token");

      expect(accessCookie?.value).toBeTruthy();
      expect(accessCookie?.httpOnly).toBe(true);
      expect(accessCookie?.["path"]).toBe("/");
      expect(String(accessCookie?.sameSite).toLowerCase()).toBe("lax");

      expect(refreshCookie?.value).toBeTruthy();
      expect(refreshCookie?.httpOnly).toBe(true);
    });

    it("sets httpOnly auth cookies on login", async () => {
      await registerUser(app, "cookie-login@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "cookie-login@test.com", password: PASSWORD },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.cookies.find((c) => c.name === "access_token")?.httpOnly).toBe(
        true,
      );
      expect(
        res.cookies.find((c) => c.name === "refresh_token")?.httpOnly,
      ).toBe(true);
    });

    it("authenticates a request carrying only the access-token cookie", async () => {
      const user = await registerUser(app, "cookie-only@test.com", PASSWORD);

      const res = await app.inject({
        method: "GET",
        url: "/me",
        cookies: { access_token: user.access_token },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ user_id: user.user_id });
    });

    it("returns 401 for a garbage access-token cookie", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/me",
        cookies: { access_token: "garbage-token" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("clears the auth cookies on logout", async () => {
      const user = await registerUser(app, "cookie-logout@test.com", PASSWORD);
      const csrf = await getCsrf(app);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: { access_token: user.access_token, _csrf: csrf.secret },
        headers: { "x-csrf-token": csrf.token },
      });

      expect(res.statusCode).toBe(200);
      expect(res.cookies.find((c) => c.name === "access_token")?.value).toBe(
        "",
      );
      expect(res.cookies.find((c) => c.name === "refresh_token")?.value).toBe(
        "",
      );
    });
  });

  // ── Transparent session refresh ──────────────────────────────────────────

  describe("transparent session refresh", () => {
    it("renews the access-token cookie when only the refresh cookie is presented", async () => {
      const user = await registerUser(app, "silent-refresh@test.com", PASSWORD);

      // Same second-precision `iat` caveat as the rotation test above: without
      // this gap the renewed token is byte-identical to the original one.
      await sleep(1100);

      const res = await app.inject({
        method: "GET",
        url: "/me",
        cookies: { refresh_token: user.refresh_token },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ user_id: user.user_id });

      const accessCookie = res.cookies.find((c) => c.name === "access_token");
      expect(accessCookie?.httpOnly).toBe(true);
      expect(accessCookie?.value).toBeTruthy();
      expect(accessCookie?.value).not.toBe(user.access_token);
    });

    it("rotates once for a burst of concurrent requests sharing one refresh cookie", async () => {
      const user = await registerUser(app, "burst-refresh@test.com", PASSWORD);

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          app.inject({
            method: "GET",
            url: "/me",
            cookies: { refresh_token: user.refresh_token },
          }),
        ),
      );

      for (const res of responses) {
        expect(res.statusCode).toBe(200);
      }

      // One rotation for the whole burst means every response carries the very
      // same freshly issued token.
      const issued = new Set(
        responses.map(
          (res) => res.cookies.find((c) => c.name === "access_token")?.value,
        ),
      );
      expect(issued.size).toBe(1);
    });

    it("returns 401 when the refresh cookie is not valid", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/me",
        cookies: { refresh_token: "garbage-refresh-token" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("leaves POST /refresh-token to rotate on its own", async () => {
      const user = await registerUser(
        app,
        "explicit-refresh@test.com",
        PASSWORD,
      );

      // Were the hook to rotate first, the cookie the handler then reads would
      // already be stale and this would come back 401.
      const res = await app.inject({
        method: "POST",
        url: "/refresh-token",
        cookies: { refresh_token: user.refresh_token },
      });

      expect(res.statusCode).toBe(204);
    });

    it("clears the auth cookies on logout when only the refresh cookie remains", async () => {
      const user = await registerUser(app, "refresh-logout@test.com", PASSWORD);
      const csrf = await getCsrf(app);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: { refresh_token: user.refresh_token, _csrf: csrf.secret },
        headers: { "x-csrf-token": csrf.token },
      });

      expect(res.statusCode).toBe(200);

      // The hook renews the cookie before the handler clears it, so what the
      // browser ends up applying is whichever Set-Cookie comes last.
      const accessCookies = res.cookies.filter(
        (c) => c.name === "access_token",
      );
      expect(accessCookies.at(-1)?.value).toBe("");
    });
  });

  // ── CSRF protection ──────────────────────────────────────────────────────

  describe("CSRF protection", () => {
    it("issues a token and the secret cookie backing it", async () => {
      const res = await app.inject({ method: "GET", url: "/csrf-token" });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).csrf_token).toEqual(expect.any(String));

      const secretCookie = res.cookies.find((c) => c.name === "_csrf");
      expect(secretCookie?.value).toBeTruthy();
      expect(secretCookie?.httpOnly).toBe(true);
    });

    it("rejects a cookie-authenticated mutating request carrying no token", async () => {
      const user = await registerUser(app, "csrf-missing@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: { access_token: user.access_token },
      });

      expect(res.statusCode).toBe(403);
    });

    it("rejects a token that does not match the secret cookie", async () => {
      const user = await registerUser(app, "csrf-mismatch@test.com", PASSWORD);
      const mine = await getCsrf(app);
      const someoneElses = await getCsrf(app);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: { access_token: user.access_token, _csrf: mine.secret },
        headers: { "x-csrf-token": someoneElses.token },
      });

      expect(res.statusCode).toBe(403);
    });

    it("accepts a cookie-authenticated mutating request carrying a valid token", async () => {
      const user = await registerUser(app, "csrf-valid@test.com", PASSWORD);
      const csrf = await getCsrf(app);

      const res = await app.inject({
        method: "POST",
        url: "/logout",
        cookies: { access_token: user.access_token, _csrf: csrf.secret },
        headers: { "x-csrf-token": csrf.token },
      });

      expect(res.statusCode).toBe(200);
    });

    it("leaves safe methods alone", async () => {
      const user = await registerUser(app, "csrf-safe@test.com", PASSWORD);

      const res = await app.inject({
        method: "GET",
        url: "/me",
        cookies: { access_token: user.access_token },
      });

      expect(res.statusCode).toBe(200);
    });

    it("leaves the login route reachable while auth cookies are present", async () => {
      const user = await registerUser(app, "csrf-login@test.com", PASSWORD);

      const res = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email: "csrf-login@test.com", password: PASSWORD },
        cookies: { access_token: user.access_token },
        remoteAddress: uniqueIp(),
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
