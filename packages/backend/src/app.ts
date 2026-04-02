import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { config } from "./config/index.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./lib/logger.js";
import { authRoutes } from "./modules/auth/routes.js";
import { channelRoutes } from "./modules/channels/routes.js";
import { commandRoutes } from "./modules/commands/routes.js";
import { timerRoutes } from "./modules/timers/routes.js";
import { moderationRoutes } from "./modules/moderation/routes.js";
import { chatLogRoutes } from "./modules/chatlogs/routes.js";
import { pointsRoutes } from "./modules/points/routes.js";
import { songRequestRoutes } from "./modules/songrequests/routes.js";
import { uploadRoutes } from "./modules/uploads/routes.js";
import { editorRoutes } from "./modules/editors/routes.js";
import { eventsubRoutes } from "./modules/eventsub/routes.js";
import { alertRoutes } from "./modules/alerts/routes.js";
import { channelPointRoutes } from "./modules/channelpoints/routes.js";
import { overlayRoutes } from "./modules/overlay/routes.js";
import { eventsubWebhookRoute } from "./modules/eventsub/listener.js";
import { requestRoutes, publicRequestRoutes } from "./modules/requests/routes.js";
import { discordRoutes } from "./modules/discord/routes.js";
import { pollPredictionRoutes } from "./modules/pollprediction/routes.js";
import { counterRoutes } from "./modules/counters/routes.js";
import { lootboxRoutes } from "./modules/lootbox/routes.js";
import { viewerRoutes } from "./modules/viewer/routes.js";
import { stopwatchRoutes } from "./modules/stopwatch/routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  // BigInt JSON serialization — safe Number for small values, String for huge ones
  (BigInt.prototype as any).toJSON = function () {
    const n = this as bigint;
    if (n >= -9007199254740991n && n <= 9007199254740991n) return Number(n);
    return n.toString();
  };

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 6000,
    timeWindow: "1 minute",
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max (videos)
    },
  });

  app.setErrorHandler(errorHandler);

  // Public routes (no JWT)
  await app.register(overlayRoutes);
  await app.register(eventsubWebhookRoute);
  await app.register(publicRequestRoutes);

  // API routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(channelRoutes, { prefix: "/api/channels" });
  await app.register(commandRoutes, { prefix: "/api/channels" });
  await app.register(timerRoutes, { prefix: "/api/channels" });
  await app.register(moderationRoutes, { prefix: "/api/channels" });
  await app.register(chatLogRoutes, { prefix: "/api/channels" });
  await app.register(pointsRoutes, { prefix: "/api/channels" });
  await app.register(songRequestRoutes, { prefix: "/api/channels" });
  await app.register(uploadRoutes, { prefix: "/api/channels" });
  await app.register(editorRoutes, { prefix: "/api/channels" });
  await app.register(eventsubRoutes, { prefix: "/api/channels" });
  await app.register(alertRoutes, { prefix: "/api/channels" });
  await app.register(channelPointRoutes, { prefix: "/api/channels" });
  await app.register(requestRoutes, { prefix: "/api/channels" });
  await app.register(discordRoutes, { prefix: "/api/channels" });
  await app.register(counterRoutes, { prefix: "/api/channels" });
  await app.register(lootboxRoutes, { prefix: "/api/channels" });
  await app.register(viewerRoutes, { prefix: "/api/viewer" });
  await app.register(stopwatchRoutes, { prefix: "/api/channels" });
  await app.register(pollPredictionRoutes, { prefix: "/api/channels" });

  // Health check (used by Docker healthcheck)
  app.get("/api/health", async () => {
    const { getTwitchClient } = await import("./twitch/twitch-client.js");
    const { getDiscordClient } = await import("./discord/discord-client.js");
    const client = getTwitchClient();
    const discord = getDiscordClient();
    return {
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        twitchConnected: client.isConnected,
        channels: client.currentChannels,
        discordReady: discord.isReady,
        discordGuilds: discord.guildCount,
      },
    };
  });

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

  // Public status dashboard data
  app.get("/api/status", async () => {
    const { getTwitchClient } = await import("./twitch/twitch-client.js");
    const { getDiscordClient } = await import("./discord/discord-client.js");
    const client = getTwitchClient();
    const discord = getDiscordClient();

    const [channelCount, userCount, commandCount, chatLogCount, lootboxCount] = await Promise.all([
      prisma.channel.count(),
      prisma.channelUser.count(),
      prisma.command.count(),
      prisma.chatLog.count(),
      prisma.viewerInventoryItem.count(),
    ]);

    return {
      success: true,
      data: {
        status: client.isConnected ? "online" : "offline",
        uptime: process.uptime(),
        version: "1.0.0",
        twitch: {
          connected: client.isConnected,
          channels: client.currentChannels,
          channelCount: client.currentChannels.length,
        },
        discord: {
          connected: discord.isReady,
          guilds: discord.guildCount,
        },
        stats: {
          totalChannels: channelCount,
          totalUsers: userCount,
          totalCommands: commandCount,
          totalChatLogs: chatLogCount,
          totalLootboxItems: lootboxCount,
        },
        timestamp: new Date().toISOString(),
      },
    };
  });

  // Serve frontend static files in production (first registration decorates reply)
  const frontendDist = join(__dirname, "../../frontend/dist");
  if (existsSync(frontendDist)) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
      wildcard: false,
    });
  }

  // Serve uploaded files (second registration, no decorate)
  const uploadsDir = config.uploadsDir.startsWith("/")
    ? config.uploadsDir
    : join(process.cwd(), config.uploadsDir);
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  // SPA fallback
  if (existsSync(frontendDist)) {

    app.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith("/api/") ||
        request.url.startsWith("/ws") ||
        request.url.startsWith("/overlay/") ||
        request.url.startsWith("/uploads/") ||
        request.url.startsWith("/requests/")
      ) {
        return reply.status(404).send({ success: false, error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
