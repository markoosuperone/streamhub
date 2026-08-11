import { randomUUID } from "node:crypto";
import Fastify, { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import csrfProtection from "@fastify/csrf-protection";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { createCsrfGuard } from "./auth/infrastructure/http/csrf.hook.ts";
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
  await fastify.register(cookie);
  // The plugin's default cookieOpts omit `secure`, so they are restated here
  // rather than inherited — the CSRF secret must not travel in clear text in
  // production either.
  await fastify.register(csrfProtection, {
    cookieOpts: {
      path: "/",
      sameSite: "strict",
      httpOnly: true,
      secure: env.cookie.secure,
    },
  });
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
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "access_token",
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

  // Ordered ahead of the refresh hook so a forged request is rejected on the
  // cookies it actually arrived with, before any token is rotated for it.
  fastify.addHook("onRequest", createCsrfGuard(fastify));

  // Registered before the routes so it applies to all of them: renews an
  // expired access-token cookie in place, keeping <img>/<audio> requests — which
  // no client-side interceptor can retry — from failing on expiry.
  fastify.addHook("onRequest", container.sessionRefreshHook);

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
  await container.userRouter.register(fastify);

  return fastify;
}
