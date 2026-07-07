import { getDb } from "@/shared/db/postgres.ts";
import { FastifyInstance } from "fastify";

export class HealthCheckRouter {
  constructor(private readonly sql = getDb()) {}

  register(fastify: FastifyInstance) {
    const db = this.sql;
    fastify.get("/health", async () => {
      try {
        await db`SELECT 1`;
        return {
          status: "ok",
          db: "ok",
        };
      } catch {
        return {
          status: "fail",
          db: "down",
        };
      }
    });
  }
}
