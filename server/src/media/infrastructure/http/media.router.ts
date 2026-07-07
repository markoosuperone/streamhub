import "@fastify/rate-limit";
import { FastifyInstance } from "fastify";
import { MediaController } from "./media.controller.ts";
import { MediaIdParams } from "./media.schema.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export class MediaRoute {
  constructor(private readonly mediaController: MediaController) {}

  register(fastify: FastifyInstance) {
    fastify.post("/media/upload", {
      // Multipart is handled by @fastify/multipart; JSON Schema has no "file" type for body.
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      schema: {
        security: [{ bearerAuth: [] }],
      },
      handler: this.mediaController.upload.bind(this.mediaController),
    });

    fastify.get("/media", {
      schema: {
        querystring: PaginationQueryString,
        security: [{ bearerAuth: [] }],
      },
      handler: this.mediaController.getAllItems.bind(this.mediaController),
    });

    fastify.get("/media/:mediaId", {
      schema: {
        params: MediaIdParams,
        security: [{ bearerAuth: [] }],
      },
      handler: this.mediaController.execute.bind(this.mediaController),
    });

    fastify.delete("/media/:mediaId", {
      schema: {
        params: MediaIdParams,
        security: [{ bearerAuth: [] }],
      },
      handler: this.mediaController.delete.bind(this.mediaController),
    });
  }
}
