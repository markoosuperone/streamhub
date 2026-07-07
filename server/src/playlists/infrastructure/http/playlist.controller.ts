import { FastifyReply, FastifyRequest } from "fastify";
import { Static } from "typebox";
import { IPlaylistUsecase } from "@/playlists/application/playlist.usecase.ts";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import {
  InvalidPlaylistTitleError,
} from "@/playlists/errors/playlist.errors.ts";
import { getAuthPayload } from "@/shared/utility/getAuthPayload.ts";
import {
  CreatePlaylistBody,
  PlaylistIdParams,
  UpdatePlaylistBody,
} from "./playlist.schema.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export interface IPlaylistController {
  createPlaylist(
    request: FastifyRequest<{ Body: Static<typeof CreatePlaylistBody> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  getPlaylist(
    request: FastifyRequest<{ Params: Static<typeof PlaylistIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  getPlaylistByOwnerId(
    request: FastifyRequest<{ Querystring: Static<typeof PaginationQueryString> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  updatePlaylist(
    request: FastifyRequest<{
      Params: Static<typeof PlaylistIdParams>;
      Body: Static<typeof UpdatePlaylistBody>;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
  deletePlaylist(
    request: FastifyRequest<{ Params: Static<typeof PlaylistIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply>;
}
export class PlaylistController implements IPlaylistController {
  constructor(
    private readonly playlistUsecase: IPlaylistUsecase,
    private readonly authService: IAuthService
  ) {}

  async createPlaylist(
    request: FastifyRequest<{ Body: Static<typeof CreatePlaylistBody> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const title = this.requireTitle(request.body.title);
    const playlist = await this.playlistUsecase.createPlaylist({
      owner_id: payload.user_id,
      title,
    });
    request.log
      .child({ userId: payload.user_id, playlistId: playlist.id })
      .info("Playlist created");
    return reply.status(201).send(playlist);
  }

  async getPlaylist(
    request: FastifyRequest<{ Params: Static<typeof PlaylistIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const playlist = await this.playlistUsecase.getPlaylist(
      request.params.id,
      payload.user_id
    );
    return reply.status(200).send(playlist);
  }
  async getPlaylistByOwnerId(
    request: FastifyRequest<{ Querystring: Static<typeof PaginationQueryString> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { limit = 20, offset = 0 } = request.query;

    const payload = await getAuthPayload(request, this.authService);
    const playlist = await this.playlistUsecase.getPlaylistByOwnerId(
      payload.user_id,
      limit,
      offset
    );

    return reply.status(200).send(playlist);
  }

  async updatePlaylist(
    request: FastifyRequest<{
      Params: Static<typeof PlaylistIdParams>;
      Body: Static<typeof UpdatePlaylistBody>;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    const title = this.requireTitle(request.body.title);
    const playlist = await this.playlistUsecase.updatePlaylist(
      request.params.id,
      { id: request.params.id, title },
      payload.user_id
    );
    request.log
      .child({ userId: payload.user_id, playlistId: playlist.id })
      .info("Playlist updated");
    return reply.status(200).send(playlist);
  }

  async deletePlaylist(
    request: FastifyRequest<{ Params: Static<typeof PlaylistIdParams> }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const payload = await getAuthPayload(request, this.authService);
    await this.playlistUsecase.deletePlaylist(
      request.params.id,
      payload.user_id
    );
    request.log
      .child({ userId: payload.user_id, playlistId: request.params.id })
      .info("Playlist deleted");
    return reply.status(204).send();
  }

  private requireTitle(value: string | undefined): string {
    const title = value?.trim();
    if (!title) {
      throw new InvalidPlaylistTitleError();
    }
    return title;
  }
}
