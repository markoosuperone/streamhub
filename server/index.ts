import { env } from "./src/config/index.ts";
import { buildContainer } from "./src/container.ts";
import { buildApp } from "./src/app.ts";

async function start() {
  const container = buildContainer();
  const app = await buildApp(container);

  const shutDown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutDown("SIGTERM"));
  process.on("SIGINT", () => shutDown("SIGINT"));

  try {
    await app.listen({ port: env.server.port, host: env.server.host });
    app.log.info(
      { host: env.server.host, port: env.server.port },
      "Server is ready"
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

await start();