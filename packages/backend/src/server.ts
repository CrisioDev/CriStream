import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { initSocket } from "./lib/socket.js";
import { initTwitchClient } from "./twitch/twitch-client.js";
import { initDiscordClient } from "./discord/discord-client.js";
import { initTimerScheduler } from "./modules/timers/timer-scheduler.js";
import { initSummaryScheduler } from "./modules/summaries/summary-scheduler.js";
import { chatLogService } from "./modules/chatlogs/service.js";
import { pointsService } from "./modules/points/service.js";

async function start() {
  const app = await buildApp();

  // Connect to Redis
  await redis.connect();
  logger.info("Redis connected");

  // Connect to database
  await prisma.$connect();
  logger.info("Database connected");

  // Start listening first so app.server is available
  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.info(`Server listening on port ${config.port}`);

  // Initialize socket.io on Fastify's underlying HTTP server
  initSocket(app.server);
  logger.info("Socket.IO initialized");

  // Initialize Twitch client (after socket.io so onConnect can emit events)
  try {
    await initTwitchClient();
    logger.info("Twitch client initialized");
  } catch (err) {
    logger.warn(err, "Twitch client initialization failed - will retry on first auth");
  }

  // Initialize Discord client
  try {
    await initDiscordClient();
    logger.info("Discord client initialized");
  } catch (err) {
    logger.warn(err, "Discord client initialization failed — Discord features disabled");
  }

  // Start timer scheduler
  initTimerScheduler();

  // Start summary scheduler
  initSummaryScheduler();

  // Start chat log flusher
  chatLogService.initFlusher();

  // Start points scheduler
  pointsService.initPointsScheduler();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    await app.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
