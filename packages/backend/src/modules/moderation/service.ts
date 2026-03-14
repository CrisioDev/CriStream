import { prisma } from "../../lib/prisma.js";
import type { ModerationSettingsDto, UpdateModerationSettingsDto, ModerationActionDto } from "@streamguard/shared";

class ModerationService {
  async getSettings(channelId: string): Promise<ModerationSettingsDto> {
    const settings = await prisma.moderationSettings.findUniqueOrThrow({
      where: { channelId },
    });
    return settings as ModerationSettingsDto;
  }

  async updateSettings(
    channelId: string,
    data: UpdateModerationSettingsDto
  ): Promise<ModerationSettingsDto> {
    const settings = await prisma.moderationSettings.update({
      where: { channelId },
      data,
    });
    return settings as ModerationSettingsDto;
  }

  async getLog(channelId: string, limit = 50): Promise<ModerationActionDto[]> {
    const actions = await prisma.moderationAction.findMany({
      where: { channelId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return actions.map((a) => ({
      ...a,
      action: a.action as ModerationActionDto["action"],
      createdAt: a.createdAt.toISOString(),
    }));
  }
}

export const moderationService = new ModerationService();
