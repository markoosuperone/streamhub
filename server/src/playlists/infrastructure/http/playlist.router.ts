import { FastifyInstance } from "fastify";
import { IPlaylistController } from "./playlist.controller.ts";
import {
  CreatePlaylistBody,
  PlaylistIdParams,
  UpdatePlaylistBody,
} from "./playlist.schema.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export class PlaylistRouter {
  constructor(private readonly playlistController: IPlaylistController) {}

  register(fastify: FastifyInstance) {
    fastify.post("/playlists", {
      schema: {
        body: CreatePlaylistBody,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistController.createPlaylist.bind(
        this.playlistController,
      ),
    });
    fastify.get("/playlists/:id", {
      schema: {
        params: PlaylistIdParams,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistController.getPlaylist.bind(
        this.playlistController,
      ),
    });
    fastify.get("/playlists", {
      schema: {
        querystring: PaginationQueryString,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistController.getPlaylistByOwnerId.bind(
        this.playlistController,
      ),
    });
    fastify.patch("/playlists/:id", {
      schema: {
        params: PlaylistIdParams,
        body: UpdatePlaylistBody,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistController.updatePlaylist.bind(
        this.playlistController,
      ),
    });
    fastify.delete("/playlists/:id", {
      schema: {
        params: PlaylistIdParams,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistController.deletePlaylist.bind(
        this.playlistController,
      ),
    });
  }
}
