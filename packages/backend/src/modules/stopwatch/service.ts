import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import type { StopwatchDto } from "@cristream/shared";

class StopwatchService {
  async getAll(channelId: string): Promise<StopwatchDto[]> {
    const watches = await prisma.stopwatch.findMany({
      where: { channelId },
      orderBy: { name: "asc" },
    });
    return watches.map(this.toDto);
  }

  async create(channelId: string, name: string, game = ""): Promise<StopwatchDto> {
    const sw = await prisma.stopwatch.create({
      data: { channelId, name, game },
    });
    return this.toDto(sw);
  }

  async delete(channelId: string, id: string): Promise<void> {
    await prisma.stopwatch.delete({ where: { id, channelId } });
  }

  async start(channelId: string, id: string): Promise<StopwatchDto> {
    const sw = await prisma.stopwatch.update({
      where: { id, channelId },
      data: { running: true, startedAt: new Date() },
    });
    const dto = this.toDto(sw);
    emitToChannel(channelId, "stopwatch:update", { channelId, stopwatch: dto });
    return dto;
  }

  async stop(channelId: string, id: string): Promise<StopwatchDto> {
    const sw = await prisma.stopwatch.findUnique({ where: { id } });
    if (!sw || !sw.running || !sw.startedAt) {
      const current = await prisma.stopwatch.findUnique({ where: { id } });
      return this.toDto(current!);
    }

    const elapsed = sw.elapsedMs + (Date.now() - sw.startedAt.getTime());
    const updated = await prisma.stopwatch.update({
      where: { id, channelId },
      data: { running: false, startedAt: null, elapsedMs: elapsed },
    });
    const dto = this.toDto(updated);
    emitToChannel(channelId, "stopwatch:update", { channelId, stopwatch: dto });
    return dto;
  }

  async reset(channelId: string, id: string): Promise<StopwatchDto> {
    const sw = await prisma.stopwatch.update({
      where: { id, channelId },
      data: { running: false, startedAt: null, elapsedMs: 0 },
    });
    const dto = this.toDto(sw);
    emitToChannel(channelId, "stopwatch:update", { channelId, stopwatch: dto });
    return dto;
  }

  async updateGame(channelId: string, id: string, game: string): Promise<StopwatchDto> {
    const sw = await prisma.stopwatch.update({
      where: { id, channelId },
      data: { game },
    });
    const dto = this.toDto(sw);
    emitToChannel(channelId, "stopwatch:update", { channelId, stopwatch: dto });
    return dto;
  }

  private toDto(sw: any): StopwatchDto {
    return {
      id: sw.id,
      name: sw.name,
      game: sw.game,
      elapsedMs: sw.elapsedMs,
      running: sw.running,
      startedAt: sw.startedAt?.toISOString() ?? null,
      channelId: sw.channelId,
    };
  }
}

export const stopwatchService = new StopwatchService();
