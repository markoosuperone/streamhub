import { randomUUID } from "node:crypto";
import Fastify, { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { Container } from "./container.ts";
import env from "./config/env.ts";
import { closeDbConnection } from "./shared/db/postgres.ts";
import { registerErrorHandler } from "./shared/http/error-handler.ts";
import { logger } from "./shared/logger/logger.ts";

export async function buildApp(container: Container): Promise<FastifyInstance> {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: (req) => {
      return (req.headers["request-id"] as string) ?? randomUUID();
    },
    routerOptions: {
      ignoreDuplicateSlashes: true,
    },
    ajv: {
      customOptions: {
        keywords: ["example"],
      },
    },
  });

  // ── Plugins ─────────────────────────────────────────────────────────────────
  await fastify.register(rateLimit, { global: false });
  await fastify.register(cors, {
    origin: ["http://localhost:3000"],
    credentials: true,
  });
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(multipart, {
    limits: {
      fileSize: env.media.maxFileSizeBytes,
      files: 1,
    },
  });
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "SuperPlayer API",
        description:
          "REST API for uploading, streaming, and organizing audio/video media into playlists.",
        version: "1.0.0",
      },
      servers: [{ url: `http://${env.server.host}:${env.server.port}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // ── Hooks ────────────────────────────────────────────────────────────────────
  registerErrorHandler(fastify);

  fastify.addHook("onClose", async (instance) => {
    instance.log.info("Closing database connection…");
    await closeDbConnection();
  });

  // ── Routes ───────────────────────────────────────────────────────────────────
  await container.healthCheckRouter.register(fastify);
  await container.authRoute.register(fastify);
  await container.mediaRoute.register(fastify);
  await container.playlistRouter.register(fastify);
  await container.playlistItemRouter.register(fastify);

  return fastify;
}