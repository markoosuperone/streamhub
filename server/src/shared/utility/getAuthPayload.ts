import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { UnauthorizedError } from "@/auth/error/errors.ts";
import { FastifyRequest } from "fastify";

export async function getAuthPayload(
  request: FastifyRequest,
  authService: IAuthService
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError();
  }

  return authService.authenticate(authHeader);
}