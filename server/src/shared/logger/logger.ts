import pino from "pino";
import type { FastifyBaseLogger } from "fastify";
import { env } from "@/config/index.ts";

/**
 * Root Pino instance. Passed into Fastify as `loggerInstance` so that
 * `request.log` (and its `.child(...)` bindings) share the same
 * configuration and output stream as logging done outside the request
 * lifecycle (repositories, file system access, transactions).
 *
 * Typed as `FastifyBaseLogger` (Fastify's default logger generic) rather
 * than the concrete Pino type, so passing it as `loggerInstance` doesn't
 * narrow Fastify's `Logger` generic away from the default that the rest of
 * the app (e.g. `Container`, which types routers against a plain
 * `FastifyInstance`) expects.
 */
export const logger: FastifyBaseLogger = pino({
  level: env.log.level,
  redact: ["headers.authorization"],
});

const LOGGED = Symbol("alreadyLogged");
type Taggable = Record<symbol, unknown>;

/**
 * Marks an error as already logged at its origin (repository, file service,
 * transaction manager) so the global error handler doesn't emit a second
 * ERROR line for the same failure.
 */
export function markLogged(error: unknown): void {
  if (error && typeof error === "object") {
    (error as Taggable)[LOGGED] = true;
  }
}

export function hasBeenLogged(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    Boolean((error as Taggable)[LOGGED])
  );
}
