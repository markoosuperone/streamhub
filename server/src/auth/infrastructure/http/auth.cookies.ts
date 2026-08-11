import { FastifyReply } from "fastify";

import { TokenPairDTO } from "@/auth/dto/auth.dto.ts";
import env from "@/config/env.ts";

export const AUTH_COOKIES = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;

// The cookie values are JWTs, which carry their own signature — signing the
// cookie itself would add a second, redundant integrity check.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: "lax",
  path: "/",
} as const;

export function setAuthCookies(
  reply: FastifyReply,
  tokens: TokenPairDTO,
): void {
  reply.setCookie(AUTH_COOKIES.accessToken, tokens.access_token, {
    ...COOKIE_OPTIONS,
    expires: tokens.access_token_expires_at,
  });
  reply.setCookie(AUTH_COOKIES.refreshToken, tokens.refresh_token, {
    ...COOKIE_OPTIONS,
    expires: tokens.refresh_token_expires_at,
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(AUTH_COOKIES.accessToken, COOKIE_OPTIONS);
  reply.clearCookie(AUTH_COOKIES.refreshToken, COOKIE_OPTIONS);
}
