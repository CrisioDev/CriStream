import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./lib/logger.js";
import { authRoutes } from "./modules/auth/routes.js";
import { channelRoutes } from "./modules/channels/routes.js";
import { commandRoutes } from "./modules/commands/routes.js";
import { timerRoutes } from "./modules/timers/routes.js";
import { moderationRoutes } from "./modules/moderation/routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(errorHandler);

  // API routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(channelRoutes, { prefix: "/api/channels" });
  await app.register(commandRoutes, { prefix: "/api/channels" });
  await app.register(timerRoutes, { prefix: "/api/channels" });
  await app.register(moderationRoutes, { prefix: "/api/channels" });

  // Health check
  app.get("/api/health", async () => ({
    success: true,
    data: { status: "ok", timestamp: new Date().toISOString() },
  }));

  // Bot status
  app.get("/api/bot/status", async () => {
    const { getTwitchClient } = await import("./twitch/twitch-client.js");
    const client = getTwitchClient();
    return {
      success: true,
      data: {
        connected: client?.isConnected ?? false,
        uptime: process.uptime(),
        channels: client?.currentChannels ?? [],
      },
    };
  });

  // Serve frontend static files in production
  const frontendDist = join(__dirname, "../../frontend/dist");
  if (existsSync(frontendDist)) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/") || request.url.startsWith("/ws")) {
        return reply.status(404).send({ success: false, error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
