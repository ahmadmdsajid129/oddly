/**
 * @file index.ts
 * @package @oddly/api
 *
 * Boot script for Oddly API service.
 */

import { buildServer } from "./server.js";

export * from "./server.js";
export * from "./db/index.js";

const start = async () => {
  const server = await buildServer();
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await server.listen({ port, host });
    server.log.info(`Oddly API service running at http://${host}:${port}`);
    server.log.info(`Interactive API docs available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}
