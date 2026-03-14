import IORedis from "ioredis";
import { config } from "../config/index.js";

export const redis = new (IORedis as any)(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}) as InstanceType<typeof IORedis.default>;
