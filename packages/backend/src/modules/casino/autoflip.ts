import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { broadcastToUser, broadcast } from "./sse.js";

/**
 * Auto-Flipper Bot — unlocked at Season Pass Level 50
 * Automatically flips coins for the player.
 * Each prestige level makes it faster.
 *
 * Prestige 0: every 60s
 * Prestige 1: every 50s
 * Prestige 2: every 40s
 * Prestige 3: every 30s
 * Prestige 4: every 25s
 * Prestige 5: every 20s
 * Prestige 6: every 15s
 * Prestige 7: every 12s
 * Prestige 8: every 10s
 * Prestige 9: every 8s
 * Prestige 10+: every 5s
 */

const PRESTIGE_INTERVALS = [60, 50, 40, 30, 25, 20, 15, 12, 10, 8, 5];

export function getFlipInterval(prestige: number): number {
  return PRESTIGE_INTERVALS[Math.min(prestige, PRESTIGE_INTERVALS.length - 1)]!;
}

/** Get prestige level for a user */
export async function getPrestige(channelId: string, userId: string): Promise<number> {
  const val = await redis.get(`casino:prestige:${channelId}:${userId}`);
  return val ? parseInt(val) : 0;
}

/** Prestige: reset season progress, increment prestige counter */
export async function doPrestige(channelId: string, userId: string): Promise<{ success: boolean; prestige?: number; error?: string }> {
  // Check if user is level 50
  const { getSeasonProgress } = await import("./battlepass.js");
  const data = await getSeasonProgress(channelId, userId);
  if (data.progress.level < 50) {
    return { success: false, error: "Du musst Level 50 erreichen um Prestige zu machen!" };
  }

  // Increment prestige
  const prestigeKey = `casino:prestige:${channelId}:${userId}`;
  const newPrestige = await redis.incr(prestigeKey);

  // Reset season progress (XP + level to 0, keep premium, clear claimed)
  await prisma.seasonProgress.updateMany({
    where: { channelId, twitchUserId: userId, seasonId: data.season.id },
    data: { xp: 0, level: 0, claimedLevels: [] },
  });

  // Award prestige title
  const titles = [
    "Prestige I", "Prestige II", "Prestige III", "Prestige IV", "Prestige V",
    "Prestige VI", "Prestige VII", "Prestige VIII", "Prestige IX", "Prestige X",
  ];
  const titleName = newPrestige <= 10 ? titles[newPrestige - 1] : `Prestige ${newPrestige}`;
  await prisma.activeTitle.upsert({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    create: { channelId, twitchUserId: userId, title: titleName! },
    update: { title: titleName! },
  });

  // Activate auto-flipper
  await redis.set(`casino:autoflip:${channelId}:${userId}`, JSON.stringify({
    active: true,
    prestige: newPrestige,
    lastFlip: Date.now(),
  }));

  // Log to feed
  const entry = JSON.stringify({
    user: "CASINO", game: "prestige", payout: 0, profit: 0,
    detail: `⭐ Prestige ${newPrestige}! Auto-Flipper freigeschaltet (alle ${getFlipInterval(newPrestige)}s)`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { success: true, prestige: newPrestige };
}

/** Get auto-flipper status */
export async function getAutoFlipStatus(channelId: string, userId: string): Promise<{
  active: boolean;
  prestige: number;
  interval: number;
  totalFlips: number;
  totalWon: number;
} | null> {
  const prestige = await getPrestige(channelId, userId);
  if (prestige === 0) return null;

  const raw = await redis.get(`casino:autoflip:${channelId}:${userId}`);
  const data = raw ? JSON.parse(raw) : { active: true, prestige, lastFlip: Date.now() };
  const statsRaw = await redis.get(`casino:autoflip:stats:${channelId}:${userId}`);
  const stats = statsRaw ? JSON.parse(statsRaw) : { totalFlips: 0, totalWon: 0 };

  return {
    active: data.active,
    prestige,
    interval: getFlipInterval(prestige),
    totalFlips: stats.totalFlips,
    totalWon: stats.totalWon,
  };
}

/** Toggle auto-flipper on/off */
export async function toggleAutoFlip(channelId: string, userId: string): Promise<boolean> {
  const raw = await redis.get(`casino:autoflip:${channelId}:${userId}`);
  if (!raw) return false;
  const data = JSON.parse(raw);
  data.active = !data.active;
  data.lastFlip = Date.now();
  await redis.set(`casino:autoflip:${channelId}:${userId}`, JSON.stringify(data));
  return data.active;
}

/**
 * Process all auto-flippers — called by the scheduler every 5 seconds
 */
export async function processAutoFlips(): Promise<void> {
  try {
    // Find all active auto-flipper keys
    const keys = await redis.keys("casino:autoflip:*");
    if (keys.length === 0) return;

    const now = Date.now();

    for (const key of keys) {
      try {
        const raw = await redis.get(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (!data.active) continue;

        // Parse channelId and userId from key: casino:autoflip:{channelId}:{userId}
        const parts = key.split(":");
        if (parts.length < 4) continue;
        const channelId = parts[2]!;
        const userId = parts[3]!;

        const prestige = await getPrestige(channelId, userId);
        const interval = getFlipInterval(prestige) * 1000;

        if (now - data.lastFlip < interval) continue;

        // Do the flip!
        const win = Math.random() < 0.50;
        const channelUser = await prisma.channelUser.findUnique({
          where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
        });
        if (!channelUser) continue;

        if (win) {
          await prisma.channelUser.update({
            where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
            data: { points: { increment: 2 } },
          });
        } else if (channelUser.points >= 1) {
          await prisma.channelUser.update({
            where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
            data: { points: { decrement: 1 } },
          });
        }

        // Update last flip time
        data.lastFlip = now;
        await redis.set(key, JSON.stringify(data));

        // Update stats
        const statsKey = `casino:autoflip:stats:${channelId}:${userId}`;
        const statsRaw = await redis.get(statsKey);
        const stats = statsRaw ? JSON.parse(statsRaw) : { totalFlips: 0, totalWon: 0 };
        stats.totalFlips++;
        if (win) stats.totalWon++;
        await redis.set(statsKey, JSON.stringify(stats));

        // Broadcast autoflip stats to the user
        broadcastToUser(channelId, userId, "autoflip", {
          active: true,
          prestige,
          interval: getFlipInterval(prestige),
          totalFlips: stats.totalFlips,
          totalWon: stats.totalWon,
        });

        // Log every 10th flip to feed (not every one to avoid spam)
        if (stats.totalFlips % 10 === 0) {
          const entry = JSON.stringify({
            user: channelUser.displayName,
            game: "autoflip",
            payout: win ? 2 : 0,
            profit: win ? 1 : -1,
            detail: `🤖 Auto-Flip #${stats.totalFlips} (${stats.totalWon}/${stats.totalFlips} wins, P${prestige})`,
            time: now,
          });
          await redis.lpush(`casino:feed:${channelId}`, entry);
          await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

          // Broadcast updated feed to all clients
          try {
            const raw = await redis.lrange(`casino:feed:${channelId}`, 0, 19);
            const feed = raw.map((r: string) => JSON.parse(r));
            broadcast(channelId, "feed", feed);
          } catch {}
        }
      } catch {
        // Skip individual flipper errors
      }
    }
  } catch (err) {
    logger.error({ err }, "Auto-flip processor error");
  }
}

/**
 * Start the auto-flip scheduler
 */
export function startAutoFlipScheduler(): void {
  setInterval(() => {
    processAutoFlips().catch(() => {});
  }, 5000); // Check every 5 seconds
  logger.info("Auto-flip scheduler started (5s interval)");
}
