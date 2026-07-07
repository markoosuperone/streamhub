import { IPlaylistItemUsecase } from "@/playlists/application/playlist-item.usecase.ts";
import { FastifyReply, FastifyRequest } from "fastify";
import { Static } from "typebox";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { getAuthPayload } from "@/shared/utility/getAuthPayload.ts";
import {
  CreatePlaylistItemBody,
  PlaylistItemIdParams,
  PlaylistItemsByPlaylistIdParams,
  UpdatePlaylistItemBody,
} from "./playlist-item.schema.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export interface IPlaylistItemController {
  createPlaylistItem(
    request: FastifyRequest<{ Body: Static<typeof CreatePlaylistItemBody> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  getPlaylistItem(
    request: FastifyRequest<{ Params: Static<typeof PlaylistItemIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  updatePlaylistItem(
    request: FastifyRequest<{
      Params: Static<typeof PlaylistItemIdParams>;
      Body: Static<typeof UpdatePlaylistItemBody>;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  deletePlaylistItem(
    request: FastifyRequest<{ Params: Static<typeof PlaylistItemIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  getByPlaylistId(
    request: FastifyRequest<{
      Params: Static<typeof PlaylistItemsByPlaylistIdParams>;
      Querystring: Static<typeof PaginationQueryString>;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
}
export class PlaylistItemController implements IPlaylistItemController {
  constructor(
    private readonly playlistItemUsecase: IPlaylistItemUsecase,
    private readonly authService: IAuthService
  ) {}

  async createPlaylistItem(
    request: FastifyRequest<{ Body: Static<typeof CreatePlaylistItemBody> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const playlistItem = await this.playlistItemUsecase.createPlaylistItem(
      {
        ...request.body,
      },
      payload.user_id
    );
    return reply.status(201).send(playlistItem);
  }

  async getPlaylistItem(
    request: FastifyRequest<{ Params: Static<typeof PlaylistItemIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const playlistItem = await this.playlistItemUsecase.getPlaylistItem(
      request.params.id,
      payload.user_id
    );
    return reply.status(200).send(playlistItem);
  }

  async updatePlaylistItem(
    request: FastifyRequest<{
      Params: Static<typeof PlaylistItemIdParams>;
      Body: Static<typeof UpdatePlaylistItemBody>;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const playlistItem = await this.playlistItemUsecase.updatePlaylistItem(
      request.params.id,
      { id: request.params.id, position: request.body.position },
      payload.user_id
    );
    return reply.status(200).send(playlistItem);
  }
  async getByPlaylistId(
    request: FastifyRequest<{
      Params: Static<typeof PlaylistItemsByPlaylistIdParams>;
      Querystring: Static<typeof PaginationQueryString>;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { limit = 20, offset = 0 } = request.query;
    const payload = await getAuthPayload(request, this.authService);
    const playlistItems = await this.playlistItemUsecase.getByPlaylistId(
      request.params.playlistId,
      payload.user_id,
      limit,
      offset
    );
    return reply.status(200).send(playlistItems);
  }

  async deletePlaylistItem(
    request: FastifyRequest<{ Params: Static<typeof PlaylistItemIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    await this.playlistItemUsecase.deletePlaylistItem(
      request.params.id,
      payload.user_id
    );
    return reply.status(204).send();
  }
}
