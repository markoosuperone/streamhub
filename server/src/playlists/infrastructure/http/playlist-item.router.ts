import { FastifyInstance } from "fastify";
import { PlaylistItemController } from "./playlist-item.controller.ts";
import {
  CreatePlaylistItemBody,
  PlaylistItemIdParams,
  PlaylistItemListQueryString,
  PlaylistItemsByPlaylistIdParams,
  UpdatePlaylistItemBody,
} from "./playlist-item.schema.ts";

export class PlaylistItemRouter {
  constructor(
    private readonly playlistItemController: PlaylistItemController,
  ) {}

  register(fastify: FastifyInstance) {
    fastify.post("/playlist-items", {
      schema: {
        body: CreatePlaylistItemBody,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistItemController.createPlaylistItem.bind(
        this.playlistItemController,
      ),
    });
    fastify.get("/playlist-items/:id", {
      schema: {
        params: PlaylistItemIdParams,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistItemController.getPlaylistItem.bind(
        this.playlistItemController,
      ),
    });
    fastify.get("/playlist-items/:playlistId/items", {
      schema: {
        params: PlaylistItemsByPlaylistIdParams,
        querystring: PlaylistItemListQueryString,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistItemController.getByPlaylistId.bind(
        this.playlistItemController,
      ),
    });
    fastify.patch("/playlist-items/:id", {
      schema: {
        params: PlaylistItemIdParams,
        body: UpdatePlaylistItemBody,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistItemController.updatePlaylistItem.bind(
        this.playlistItemController,
      ),
    });
    fastify.delete("/playlist-items/:id", {
      schema: {
        params: PlaylistItemIdParams,
        security: [{ cookieAuth: [] }],
      },
      handler: this.playlistItemController.deletePlaylistItem.bind(
        this.playlistItemController,
      ),
    });
  }
}
