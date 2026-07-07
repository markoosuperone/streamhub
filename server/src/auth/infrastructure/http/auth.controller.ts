import { FastifyReply, FastifyRequest } from "fastify";
import { IAuthUsecase } from "@/auth/application/auth.usecase.ts";
import { LoginBody, RegisterBody, RefreshTokenBody } from "./auth.schema.ts";
import { Static } from "typebox";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { getAuthPayload } from "@/shared/utility/getAuthPayload.ts";

export class AuthController {
  constructor(
    private readonly authUsecase: IAuthUsecase,
    private readonly authService: IAuthService
  ) {}

  register = async (
    request: FastifyRequest<{ Body: Static<typeof RegisterBody> }>,
    reply: FastifyReply
  ) => {
    const { email, password } = request.body;
    const auth = await this.authUsecase.registerAuth({ email, password });
    request.log
      .child({ userId: auth.user.user_id })
      .info("User registered");
    return reply.status(201).send(auth);
  };

  login = async (
    request: FastifyRequest<{ Body: Static<typeof LoginBody> }>,
    reply: FastifyReply
  ) => {
    const { email, password } = request.body;
    const auth = await this.authUsecase.loginAuth({ email, password });
    request.log
      .child({ userId: auth.user.user_id, sessionId: auth.session_id })
      .info("User logged in");
    return reply.status(200).send(auth);
  };

  refreshToken = async (
    request: FastifyRequest<{ Body: Static<typeof RefreshTokenBody> }>,
    reply: FastifyReply
  ) => {
    const { refresh_token } = request.body;
    const auth = await this.authUsecase.refreshToken(refresh_token);
    return reply.status(200).send(auth);
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = await getAuthPayload(request, this.authService);
    await this.authUsecase.logoutAuth(payload.session_id);
    request.log
      .child({ userId: payload.user_id, sessionId: payload.session_id })
      .info("User logged out");
    return reply.status(200).send({ message: "Logged out successfully" });
  };
}
