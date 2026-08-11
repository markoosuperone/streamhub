import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";

import { AUTH_COOKIES } from "./auth.cookies.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// A client cannot hold a CSRF token before it has a session, so the routes that
// establish one are necessarily exempt. They are safe to exempt: none of them
// act on an existing session's authority — they authenticate from scratch
// against credentials or a refresh token the caller had to already possess.
const EXEMPT_ROUTES = new Set(["/register", "/login", "/refresh-token"]);

export function createCsrfGuard(fastify: FastifyInstance) {
  return function guardCsrf(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ): void {
    if (SAFE_METHODS.has(request.method)) {
      done();
      return;
    }

    if (EXEMPT_ROUTES.has(request.routeOptions.url ?? "")) {
      done();
      return;
    }

    // CSRF only exists where credentials travel ambiently. A bearer token is
    // attached deliberately by the caller and can never be replayed by a
    // third-party site, so header-authenticated requests need no token — which
    // is also what keeps the (still bearer-based) BFF working during migration.
    const carriesAuthCookie = Boolean(
      request.cookies[AUTH_COOKIES.accessToken] ??
      request.cookies[AUTH_COOKIES.refreshToken],
    );
    if (!carriesAuthCookie) {
      done();
      return;
    }

    // Runs at onRequest, so a forged upload is rejected before its body is
    // parsed rather than after buffering it.
    fastify.csrfProtection(request, reply, done);
  };
}
