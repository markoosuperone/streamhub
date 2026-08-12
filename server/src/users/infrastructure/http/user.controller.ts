import { FastifyReply, FastifyRequest } from "fastify";
import { Static } from "typebox";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { IUserUsecase } from "@/users/application/user.usecase.ts";
import { getAuthPayload } from "@/shared/utility/getAuthPayload.ts";
import { IdParams } from "@/shared/http/schemas.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export interface IUserController {
  getMe(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  getUsers(
    request: FastifyRequest<{
      Querystring: Static<typeof PaginationQueryString>;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply>;
  getUser(
    request: FastifyRequest<{ Params: Static<typeof IdParams> }>,
    reply: FastifyReply,
  ): Promise<FastifyReply>;
}

export class UserController implements IUserController {
  constructor(
    private readonly userUsecase: IUserUsecase,
    private readonly authService: IAuthService,
  ) {}

  async getMe(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const user = await this.userUsecase.getUser(payload.user_id);
    return reply.status(200).send(user);
  }

  async getUsers(
    request: FastifyRequest<{
      Querystring: Static<typeof PaginationQueryString>;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    await getAuthPayload(request, this.authService);
    const { limit = 20, offset = 0 } = request.query;
    const users = await this.userUsecase.getAllUsers(limit, offset);
    return reply.status(200).send(users);
  }

  async getUser(
    request: FastifyRequest<{ Params: Static<typeof IdParams> }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    await getAuthPayload(request, this.authService);
    const user = await this.userUsecase.getUser(request.params.id);
    return reply.status(200).send(user);
  }
}
