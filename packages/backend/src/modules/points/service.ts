import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import type { PointsSettingsDto, UpdatePointsSettingsDto, ChannelUserDto, LeaderboardEntry } from "@cristream/shared";

class PointsService {
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private watchInterval: ReturnType<typeof setInterval> | null = null;

  initPointsScheduler() {
    // Flush message points every 60s
    this.flushInterval = setInterval(() => this.flushMessagePoints(), 60_000);

    // Award watch-time points every 60s
    this.watchInterval = setInterval(() => this.awardWatchTimePoints(), 60_000);

    logger.info("Points scheduler started");
  }

  /** Called by handler on each message: INCRBY in Redis */
  async addMessagePoints(channelId: string, twitchUserId: string, displayName: string, amount: number) {
    const key = `pts:msg:${channelId}:${twitchUserId}`;
    await redis.incrby(key, amount);
    // Store display name for flush
    await redis.set(`pts:name:${channelId}:${twitchUserId}`, displayName, "EX", 3600);
    // Track active user for watch-time
    await redis.sadd(`pts:watch:${channelId}`, twitchUserId);
    await redis.expire(`pts:watch:${channelId}`, 600);
  }

  /** Flush accumulated message points from Redis to DB */
  private async flushMessagePoints() {
    try {
      const keys = await redis.keys("pts:msg:*");
      if (keys.length === 0) return;

      for (const key of keys) {
        // pts:msg:{channelId}:{twitchUserId}
        const parts = key.split(":");
        const channelId = parts[2]!;
        const twitchUserId = parts[3]!;

        const points = parseInt((await redis.getdel(key)) ?? "0", 10);
        if (points <= 0) continue;

        const displayName = (await redis.get(`pts:name:${channelId}:${twitchUserId}`)) ?? twitchUserId;

        await prisma.channelUser.upsert({
          where: { channelId_twitchUserId: { channelId, twitchUserId } },
          create: { channelId, twitchUserId, displayName, points },
          update: { points: { increment: points }, displayName, lastSeen: new Date() },
        });
      }
    } catch (err) {
      logger.error({ err }, "Failed to flush message points");
    }
  }

  /** Award watch-time points to active users */
  private async awardWatchTimePoints() {
    try {
      const channels = await prisma.channel.findMany({
        where: { botJoined: true },
        include: { pointsSettings: true },
      });

      for (const channel of channels) {
        if (!channel.pointsSettings?.enabled) continue;

        const settings = channel.pointsSettings;
        const watchKey = `pts:watch:${channel.id}`;
        const activeUsers = await redis.smembers(watchKey);

        if (activeUsers.length === 0) continue;

        // Check if interval has passed using a timer key
        const timerKey = `pts:timer:${channel.id}`;
        const set = await redis.set(timerKey, "1", "EX", settings.intervalMinutes * 60, "NX");
        if (!set) continue; // Interval hasn't passed yet

        for (const twitchUserId of activeUsers) {
          const displayName = (await redis.get(`pts:name:${channel.id}:${twitchUserId}`)) ?? twitchUserId;

          await prisma.channelUser.upsert({
            where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId } },
            create: {
              channelId: channel.id,
              twitchUserId,
              displayName,
              points: settings.pointsPerInterval,
              watchMinutes: settings.intervalMinutes,
            },
            update: {
              points: { increment: settings.pointsPerInterval },
              watchMinutes: { increment: settings.intervalMinutes },
              displayName,
              lastSeen: new Date(),
            },
          });
        }

        // Clear active user set
        await redis.del(watchKey);
      }
    } catch (err) {
      logger.error({ err }, "Failed to award watch-time points");
    }
  }

  // ── Settings ──

  async getSettings(channelId: string): Promise<PointsSettingsDto> {
    const settings = await prisma.pointsSettings.upsert({
      where: { channelId },
      create: { channelId },
      update: {},
    });
    return settings;
  }

  async updateSettings(channelId: string, data: UpdatePointsSettingsDto): Promise<PointsSettingsDto> {
    const settings = await prisma.pointsSettings.upsert({
      where: { channelId },
      create: { channelId, ...data },
      update: data,
    });
    return settings;
  }

  // ── Leaderboard ──

  async getLeaderboard(channelId: string, limit = 50): Promise<LeaderboardEntry[]> {
    const users = await prisma.channelUser.findMany({
      where: { channelId },
      orderBy: { points: "desc" },
      take: limit,
    });
    return users.map((u, i) => ({
      rank: i + 1,
      twitchUserId: u.twitchUserId,
      displayName: u.displayName,
      points: u.points,
      watchMinutes: u.watchMinutes,
    }));
  }

  // ── User Points ──

  async getUserPoints(channelId: string, twitchUserId: string): Promise<ChannelUserDto | null> {
    const user = await prisma.channelUser.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId } },
    });
    return user;
  }

  async deductPoints(channelId: string, twitchUserId: string, amount: number): Promise<void> {
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId } },
      data: { points: { decrement: amount } },
    });
  }

  stopScheduler() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    if (this.watchInterval) clearInterval(this.watchInterval);
  }
}

export const pointsService = new PointsService();
