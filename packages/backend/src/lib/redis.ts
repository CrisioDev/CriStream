import IORedis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export const redis = new (IORedis as any)(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}) as InstanceType<typeof IORedis.default>;

// ioredis reconnects on its own; observe errors so they land in our logs
// instead of ioredis' raw console fallback.
redis.on("error", (err: Error) => {
  logger.error({ err }, "Redis connection error");
});
