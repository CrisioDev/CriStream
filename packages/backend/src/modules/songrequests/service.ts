import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { emitToChannel } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";
import type { SongRequestDto, SongRequestSettingsDto, UpdateSongRequestSettingsDto } from "@cristream/shared";

class SongRequestService {
  // ── Settings ──

  async getSettings(channelId: string): Promise<SongRequestSettingsDto> {
    const settings = await prisma.songRequestSettings.upsert({
      where: { channelId },
      create: { channelId },
      update: {},
    });
    return settings;
  }

  async updateSettings(channelId: string, data: UpdateSongRequestSettingsDto): Promise<SongRequestSettingsDto> {
    const settings = await prisma.songRequestSettings.upsert({
      where: { channelId },
      create: { channelId, ...data },
      update: data,
    });
    return settings;
  }

  // ── Queue Operations ──

  async addToQueue(channelId: string, request: SongRequestDto): Promise<boolean> {
    const queueKey = `sr:queue:${channelId}`;
    const queueLen = await redis.llen(queueKey);

    const settings = await this.getSettings(channelId);
    if (queueLen >= settings.maxQueueSize) return false;

    await redis.rpush(queueKey, JSON.stringify(request));

    emitToChannel(channelId, "songrequest:added", { channelId, request });

    // If queue was empty, tell the player to start playing
    if (queueLen === 0) {
      emitToChannel(channelId, "songrequest:play", { channelId, song: request });
    }
    return true;
  }

  async getQueue(channelId: string): Promise<SongRequestDto[]> {
    const queueKey = `sr:queue:${channelId}`;
    const items = await redis.lrange(queueKey, 0, -1);
    return items.map((item) => JSON.parse(item));
  }

  async skip(channelId: string): Promise<SongRequestDto | null> {
    const queueKey = `sr:queue:${channelId}`;
    const item = await redis.lpop(queueKey);
    if (!item) return null;

    emitToChannel(channelId, "songrequest:skipped", { channelId });

    // Tell the player the next song (or null if queue empty)
    const nextSong = await this.getCurrentSong(channelId);
    emitToChannel(channelId, "songrequest:play", { channelId, song: nextSong });

    const queue = await this.getQueue(channelId);
    emitToChannel(channelId, "songrequest:queue", { channelId, queue });

    return JSON.parse(item);
  }

  async advanceQueue(channelId: string): Promise<void> {
    const queueKey = `sr:queue:${channelId}`;
    await redis.lpop(queueKey);

    const nextSong = await this.getCurrentSong(channelId);
    emitToChannel(channelId, "songrequest:play", { channelId, song: nextSong });

    const queue = await this.getQueue(channelId);
    emitToChannel(channelId, "songrequest:queue", { channelId, queue });
  }

  async removeFromQueue(channelId: string, requestId: string): Promise<boolean> {
    const queueKey = `sr:queue:${channelId}`;
    const items = await redis.lrange(queueKey, 0, -1);
    const filtered = items.filter((item) => {
      const parsed: SongRequestDto = JSON.parse(item);
      return parsed.id !== requestId;
    });

    if (filtered.length === items.length) return false;

    await redis.del(queueKey);
    if (filtered.length > 0) {
      await redis.rpush(queueKey, ...filtered);
    }

    const queue = await this.getQueue(channelId);
    emitToChannel(channelId, "songrequest:queue", { channelId, queue });
    return true;
  }

  async clearQueue(channelId: string): Promise<void> {
    await redis.del(`sr:queue:${channelId}`);
    emitToChannel(channelId, "songrequest:queue", { channelId, queue: [] });
  }

  async getCurrentSong(channelId: string): Promise<SongRequestDto | null> {
    const queueKey = `sr:queue:${channelId}`;
    const item = await redis.lindex(queueKey, 0);
    return item ? JSON.parse(item) : null;
  }

  // ── Cooldown ──

  async checkCooldown(channelId: string, userId: string): Promise<boolean> {
    const settings = await this.getSettings(channelId);
    const key = `sr:cd:${channelId}:${userId}`;
    const set = await redis.set(key, "1", "EX", settings.userCooldownSeconds, "NX");
    return set !== null; // true = not on cooldown
  }

  // ── YouTube URL Parsing ──

  parseYouTubeUrl(input: string): { videoId: string; title: string } | null {
    // Match various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return { videoId: match[1]!, title: input };
      }
    }

    // Treat as search query / title
    if (!input.startsWith("http")) {
      return { videoId: "", title: input };
    }

    return null;
  }
}

export const songRequestService = new SongRequestService();
