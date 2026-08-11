import "@fastify/cookie";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { UnauthorizedError } from "@/auth/error/errors.ts";
import { AUTH_COOKIES } from "@/auth/infrastructure/http/auth.cookies.ts";
import { FastifyRequest } from "fastify";

// The httpOnly access-token cookie is the only credential the API accepts. If
// it is absent but a valid refresh cookie is present, the session-refresh hook
// has already renewed it by the time this runs.
export async function getAuthPayload(
  request: FastifyRequest,
  authService: IAuthService,
) {
  const accessToken = request.cookies[AUTH_COOKIES.accessToken];

  if (!accessToken) {
    throw new UnauthorizedError();
  }

  return authService.authenticateToken(accessToken);
}
