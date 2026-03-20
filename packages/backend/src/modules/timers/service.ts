import { prisma } from "../../lib/prisma.js";
import type { TimerDto, CreateTimerDto, UpdateTimerDto } from "@streamguard/shared";

class TimerService {
  async getTimers(channelId: string): Promise<TimerDto[]> {
    const timers = await prisma.timer.findMany({
      where: { channelId },
      orderBy: { name: "asc" },
    });
    return timers.map(this.toDto);
  }

  async getTimer(channelId: string, timerId: string): Promise<TimerDto> {
    const timer = await prisma.timer.findFirstOrThrow({
      where: { id: timerId, channelId },
    });
    return this.toDto(timer);
  }

  async createTimer(channelId: string, data: CreateTimerDto): Promise<TimerDto> {
    const timer = await prisma.timer.create({
      data: {
        channelId,
        name: data.name,
        message: data.message,
        intervalMinutes: data.intervalMinutes,
        minChatLines: data.minChatLines ?? 5,
        enabled: data.enabled ?? true,
        twitchEnabled: data.twitchEnabled ?? true,
        discordEnabled: data.discordEnabled ?? true,
      },
    });
    return this.toDto(timer);
  }

  async updateTimer(channelId: string, timerId: string, data: UpdateTimerDto): Promise<TimerDto> {
    const timer = await prisma.timer.update({
      where: { id: timerId, channelId },
      data,
    });
    return this.toDto(timer);
  }

  async deleteTimer(channelId: string, timerId: string): Promise<void> {
    await prisma.timer.delete({
      where: { id: timerId, channelId },
    });
  }

  private toDto(timer: {
    id: string;
    name: string;
    message: string;
    intervalMinutes: number;
    minChatLines: number;
    enabled: boolean;
    twitchEnabled: boolean;
    discordEnabled: boolean;
    channelId: string;
  }): TimerDto {
    return {
      id: timer.id,
      name: timer.name,
      message: timer.message,
      intervalMinutes: timer.intervalMinutes,
      minChatLines: timer.minChatLines,
      enabled: timer.enabled,
      twitchEnabled: timer.twitchEnabled,
      discordEnabled: timer.discordEnabled,
      channelId: timer.channelId,
    };
  }
}

export const timerService = new TimerService();
