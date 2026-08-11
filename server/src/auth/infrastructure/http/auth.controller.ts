import "@fastify/csrf-protection";
import { FastifyReply, FastifyRequest } from "fastify";
import { IAuthUsecase } from "@/auth/application/auth.usecase.ts";
import { LoginBody, RegisterBody } from "./auth.schema.ts";
import { Static } from "typebox";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { getAuthPayload } from "@/shared/utility/getAuthPayload.ts";
import {
  AUTH_COOKIES,
  clearAuthCookies,
  setAuthCookies,
} from "./auth.cookies.ts";
import { InvalidRefreshTokenError } from "@/auth/error/errors.ts";

export class AuthController {
  constructor(
    private readonly authUsecase: IAuthUsecase,
    private readonly authService: IAuthService,
  ) {}

  register = async (
    request: FastifyRequest<{ Body: Static<typeof RegisterBody> }>,
    reply: FastifyReply,
  ) => {
    const { email, password } = request.body;
    const auth = await this.authUsecase.registerAuth({ email, password });
    setAuthCookies(reply, auth);
    request.log.child({ userId: auth.user.user_id }).info("User registered");
    return reply.status(201).send({ user: auth.user });
  };

  login = async (
    request: FastifyRequest<{ Body: Static<typeof LoginBody> }>,
    reply: FastifyReply,
  ) => {
    const { email, password } = request.body;
    const auth = await this.authUsecase.loginAuth({ email, password });
    setAuthCookies(reply, auth);
    request.log
      .child({ userId: auth.user.user_id, sessionId: auth.session_id })
      .info("User logged in");
    return reply.status(200).send({ user: auth.user });
  };

  // Rotation is normally invisible — the session-refresh hook renews an expired
  // access token in place. This endpoint stays for a client that wants to force
  // it. Nothing is returned: the new pair is delivered entirely as cookies.
  refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const refresh_token = request.cookies[AUTH_COOKIES.refreshToken];
    if (!refresh_token) {
      throw new InvalidRefreshTokenError();
    }
    const tokens = await this.authUsecase.refreshToken(refresh_token);
    setAuthCookies(reply, tokens);
    return reply.status(204).send();
  };

  // Issues the token the browser must echo back on mutating requests. The
  // underlying secret cookie is reused when one already exists, so calling this
  // again (on reload, or from a second tab) doesn't invalidate tokens in use.
  csrfToken = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ csrf_token: reply.generateCsrf() });
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = await getAuthPayload(request, this.authService);
    await this.authUsecase.logoutAuth(payload.session_id);
    clearAuthCookies(reply);
    request.log
      .child({ userId: payload.user_id, sessionId: payload.session_id })
      .info("User logged out");
    return reply.status(200).send({ message: "Logged out successfully" });
  };
}
