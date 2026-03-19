import { createHash } from "node:crypto";
import { redis } from "../../../lib/redis.js";

/**
 * Checks if a user is spamming by tracking identical message hashes
 * in a sliding window. Uses Redis LIST per user.
 */
export async function checkSpam(
  channelId: string,
  userId: string,
  message: string,
  maxRepeat: number,
  windowSeconds: number
): Promise<boolean> {
  const hash = createHash("md5").update(message.toLowerCase().trim()).digest("hex");
  const key = `spam:${channelId}:${userId}`;

  // Push the hash and set expiry
  await redis.lpush(key, hash);
  await redis.expire(key, windowSeconds);

  // Trim to keep only recent entries (at most maxRepeat * 2 to be safe)
  await redis.ltrim(key, 0, maxRepeat * 2);

  // Count occurrences of this hash
  const entries = await redis.lrange(key, 0, -1);
  const count = entries.filter((e) => e === hash).length;

  return count >= maxRepeat;
}
