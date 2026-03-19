import { prisma } from "../../lib/prisma.js";
import { invalidateBannedWordsCache } from "./filters/banned-words.js";
import type { ModerationSettingsDto, UpdateModerationSettingsDto, ModerationActionDto, BannedWordDto, CreateBannedWordDto } from "@streamguard/shared";

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

  // ── Banned Words ──

  async getBannedWords(channelId: string): Promise<BannedWordDto[]> {
    const words = await prisma.bannedWord.findMany({
      where: { channelId },
      orderBy: { pattern: "asc" },
    });
    return words;
  }

  async createBannedWord(channelId: string, data: CreateBannedWordDto): Promise<BannedWordDto> {
    const word = await prisma.bannedWord.create({
      data: {
        channelId,
        pattern: data.pattern,
        isRegex: data.isRegex ?? false,
      },
    });
    await invalidateBannedWordsCache(channelId);
    return word;
  }

  async deleteBannedWord(channelId: string, wordId: string): Promise<void> {
    await prisma.bannedWord.delete({
      where: { id: wordId, channelId },
    });
    await invalidateBannedWordsCache(channelId);
  }
}

export const moderationService = new ModerationService();
