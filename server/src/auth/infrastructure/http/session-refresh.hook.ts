import { FastifyReply, FastifyRequest } from "fastify";

import { IAuthUsecase } from "@/auth/application/auth.usecase.ts";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { TokenPairDTO } from "@/auth/dto/auth.dto.ts";

import { AUTH_COOKIES, setAuthCookies } from "./auth.cookies.ts";

// These routes issue or rotate tokens themselves; refreshing underneath them
// would invalidate the very token their handler is about to use.
const SKIPPED_ROUTES = new Set([
  "/register",
  "/login",
  "/refresh-token",
  "/health",
]);

// A browser stops sending the access-token cookie the moment it expires, so a
// burst of parallel requests — a grid of <img> thumbnails, say — all arrive
// carrying only the refresh token. Rotating per request would invalidate the
// siblings, so rotations are keyed by the presented token and collapsed into
// one call. The settled pair is kept for a short window afterwards because
// stragglers were already in flight with the old cookie and cannot know it has
// been replaced. The trade-off is that the old token stays replayable for that
// window, which is the same bargain a refresh-token grace period makes.
const REFRESH_COALESCE_WINDOW_MS = 10_000;

const inFlightRotations = new Map<string, Promise<TokenPairDTO>>();

function rotateOnce(
  authUsecase: IAuthUsecase,
  refreshToken: string,
): Promise<TokenPairDTO> {
  const existing = inFlightRotations.get(refreshToken);
  if (existing) {
    return existing;
  }

  const rotation = authUsecase.refreshToken(refreshToken);
  inFlightRotations.set(refreshToken, rotation);

  rotation.then(
    () => {
      // unref so a pending window never holds the process open.
      setTimeout(
        () => inFlightRotations.delete(refreshToken),
        REFRESH_COALESCE_WINDOW_MS,
      ).unref();
    },
    () => {
      inFlightRotations.delete(refreshToken);
    },
  );

  return rotation;
}

async function hasValidAccessToken(
  authService: IAuthService,
  accessToken: string | undefined,
): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  try {
    await authService.authenticateToken(accessToken);
    return true;
  } catch {
    return false;
  }
}

export function createSessionRefreshHook(
  authService: IAuthService,
  authUsecase: IAuthUsecase,
) {
  return async function refreshSession(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (SKIPPED_ROUTES.has(request.routeOptions.url ?? "")) {
      return;
    }

    const refreshToken = request.cookies[AUTH_COOKIES.refreshToken];
    if (!refreshToken) {
      return;
    }

    const accessToken = request.cookies[AUTH_COOKIES.accessToken];
    if (await hasValidAccessToken(authService, accessToken)) {
      return;
    }

    try {
      const tokens = await rotateOnce(authUsecase, refreshToken);
      setAuthCookies(reply, tokens);
      // getAuthPayload reads the cookie, so point it at the token just issued;
      // otherwise this request would 401 despite having just been refreshed.
      request.cookies[AUTH_COOKIES.accessToken] = tokens.access_token;
    } catch {
      // Leave the request unauthenticated — getAuthPayload raises the 401.
    }
  };
}
