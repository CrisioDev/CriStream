import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";
import type { ChatLogDto, ChatLogSearchParams, PaginatedResponse } from "@streamguard/shared";

interface BufferEntry {
  twitchUserId: string;
  displayName: string;
  message: string;
  channelId: string;
  createdAt: Date;
}

class ChatLogService {
  private buffer: BufferEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  initFlusher() {
    this.flushInterval = setInterval(() => this.flush(), 5000);
    logger.info("ChatLog flusher started (5s interval)");
  }

  addToBuffer(entry: BufferEntry) {
    this.buffer.push(entry);
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);
    const byChannel = new Map<string, number>();

    try {
      await prisma.chatLog.createMany({ data: entries });

      for (const e of entries) {
        byChannel.set(e.channelId, (byChannel.get(e.channelId) ?? 0) + 1);
      }
      for (const [channelId, count] of byChannel) {
        emitToChannel(channelId, "chatlog:flushed", { channelId, count });
      }
    } catch (err) {
      logger.error({ err }, "Failed to flush chat logs");
      // Put entries back
      this.buffer.unshift(...entries);
    }
  }

  async search(
    channelId: string,
    params: ChatLogSearchParams
  ): Promise<PaginatedResponse<ChatLogDto>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: any = { channelId };

    if (params.user) {
      where.displayName = { contains: params.user, mode: "insensitive" };
    }
    if (params.keyword) {
      where.message = { contains: params.keyword, mode: "insensitive" };
    }
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [items, total] = await Promise.all([
      prisma.chatLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.chatLog.count({ where }),
    ]);

    return {
      items: items.map((l) => ({
        id: l.id,
        twitchUserId: l.twitchUserId,
        displayName: l.displayName,
        message: l.message,
        channelId: l.channelId,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async cleanup(channelId: string, retentionDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.chatLog.deleteMany({
      where: { channelId, createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  stopFlusher() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

export const chatLogService = new ChatLogService();
