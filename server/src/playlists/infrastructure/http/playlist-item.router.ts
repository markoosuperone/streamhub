import { FastifyInstance } from "fastify";
import { PlaylistItemController } from "./playlist-item.controller.ts";
import {
  CreatePlaylistItemBody,
  PlaylistItemIdParams,
  PlaylistItemsByPlaylistIdParams,
  UpdatePlaylistItemBody,
} from "./playlist-item.schema.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export class PlaylistItemRouter {
  constructor(
    private readonly playlistItemController: PlaylistItemController
  ) {}

  register(fastify: FastifyInstance) {
    fastify.post("/playlist-items", {
      schema: {
        body: CreatePlaylistItemBody,
        security: [{ bearerAuth: [] }],
      },
      handler: this.playlistItemController.createPlaylistItem.bind(
        this.playlistItemController
      ),
    });
    fastify.get("/playlist-items/:id", {
      schema: {
        params: PlaylistItemIdParams,
        security: [{ bearerAuth: [] }],
      },
      handler: this.playlistItemController.getPlaylistItem.bind(
        this.playlistItemController
      ),
    });
    fastify.get("/playlist-items/:playlistId/items", {
      schema: {
        params: PlaylistItemsByPlaylistIdParams,
        querystring: PaginationQueryString,
        security: [{ bearerAuth: [] }],
      },
      handler: this.playlistItemController.getByPlaylistId.bind(
        this.playlistItemController
      ),
    });
    fastify.patch("/playlist-items/:id", {
      schema: {
        params: PlaylistItemIdParams,
        body: UpdatePlaylistItemBody,
        security: [{ bearerAuth: [] }],
      },
      handler: this.playlistItemController.updatePlaylistItem.bind(
        this.playlistItemController
      ),
    });
    fastify.delete("/playlist-items/:id", {
      schema: {
        params: PlaylistItemIdParams,
        security: [{ bearerAuth: [] }],
      },
      handler: this.playlistItemController.deletePlaylistItem.bind(
        this.playlistItemController
      ),
    });
  }
}
