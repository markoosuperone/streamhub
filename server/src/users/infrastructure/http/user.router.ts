import { FastifyInstance } from "fastify";
import { IdParams } from "@/shared/http/schemas.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";
import { IUserController } from "./user.controller.ts";
import { UserResponse, UsersListResponse } from "./user.schema.ts";

export class UserRouter {
  constructor(private readonly userController: IUserController) {}

  register(fastify: FastifyInstance) {
    fastify.get("/me", {
      schema: {
        security: [{ cookieAuth: [] }],
        response: { 200: UserResponse },
      },
      handler: this.userController.getMe.bind(this.userController),
    });
    fastify.get("/users", {
      schema: {
        querystring: PaginationQueryString,
        security: [{ cookieAuth: [] }],
        response: { 200: UsersListResponse },
      },
      handler: this.userController.getUsers.bind(this.userController),
    });
    fastify.get("/users/:id", {
      schema: {
        params: IdParams,
        security: [{ cookieAuth: [] }],
        response: { 200: UserResponse },
      },
      handler: this.userController.getUser.bind(this.userController),
    });
  }
}
