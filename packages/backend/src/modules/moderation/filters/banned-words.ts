import { redis } from "../../../lib/redis.js";
import { prisma } from "../../../lib/prisma.js";

interface BannedWordEntry {
  pattern: string;
  isRegex: boolean;
}

/**
 * Loads banned words from DB, cached in Redis for 60s.
 * Checks message against exact matches and regex patterns.
 */
export async function checkBannedWords(
  channelId: string,
  message: string
): Promise<boolean> {
  const words = await getBannedWords(channelId);
  if (words.length === 0) return false;

  const lowerMsg = message.toLowerCase();

  for (const word of words) {
    if (word.isRegex) {
      try {
        const regex = new RegExp(word.pattern, "i");
        if (regex.test(message)) return true;
      } catch {
        // Invalid regex, skip
      }
    } else {
      if (lowerMsg.includes(word.pattern.toLowerCase())) return true;
    }
  }

  return false;
}

async function getBannedWords(channelId: string): Promise<BannedWordEntry[]> {
  const cacheKey = `bw:${channelId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const words = await prisma.bannedWord.findMany({
    where: { channelId },
    select: { pattern: true, isRegex: true },
  });

  await redis.set(cacheKey, JSON.stringify(words), "EX", 60);
  return words;
}

/**
 * Invalidates the cached banned words for a channel.
 */
export async function invalidateBannedWordsCache(channelId: string): Promise<void> {
  await redis.del(`bw:${channelId}`);
}
