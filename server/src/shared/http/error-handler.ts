import { FastifyError, FastifyInstance } from "fastify";
import { CustomError } from "@/shared/error/error.ts";
import { hasBeenLogged } from "@/shared/logger/logger.ts";

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof CustomError) {
      // 5xx CustomErrors are infrastructure failures already logged with rich
      // context at their origin (repository / file service / transaction
      // manager). 4xx CustomErrors are expected business errors and are
      // never logged. Either way, no logging is needed here.
      if (error.statusCode >= 500 && !hasBeenLogged(error)) {
        request.log.error({ err: error }, "Unhandled server error");
      }
      reply.status(error.statusCode);
      for (const [key, value] of Object.entries(error.headers)) {
        reply.header(key, value);
      }
      return reply.send({
        statusCode: error.statusCode,
        error: error.name !== "Error" ? error.name : error.constructor.name,
        message: error.message,
      });
    }

    const fastifyError = error as FastifyError;
    const statusCode = fastifyError.statusCode ?? 500;

    // Anything that isn't a CustomError is an exception nobody anticipated.
    if (statusCode >= 500 && !hasBeenLogged(error)) {
      request.log.error(
        { err: error },
        "Unexpected exception while handling request"
      );
    }

    return reply.status(statusCode).send({
      statusCode,
      error: fastifyError.name ?? "Internal Server Error",
      message: fastifyError.message,
    });
  });
}
