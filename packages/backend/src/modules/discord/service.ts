import { prisma } from "../../lib/prisma.js";
import type { DiscordSettingsDto, UpdateDiscordSettingsDto } from "@cristream/shared";
import { config } from "../../config/index.js";

class DiscordService {
  async getSettings(channelId: string): Promise<DiscordSettingsDto> {
    const settings = await prisma.discordSettings.findUnique({
      where: { channelId },
    });

    if (!settings) {
      return {
        id: "",
        channelId,
        guildId: "",
        commandChannelId: "",
        timerChannelId: "",
        summaryChannelId: "",
        notifyChannelId: "",
        pointsChannelId: "",
        commandsEnabled: false,
        timersEnabled: false,
        summariesEnabled: false,
        notificationsEnabled: false,
        notifyFollow: true,
        notifySub: true,
        notifyGiftSub: true,
        notifyRaid: true,
        notifyHypeTrain: true,
        notifyStreamOnline: true,
        notifyStreamOffline: true,
        hasBotToken: !!config.discordBotToken,
        discordClientId: config.discordClientId,
      };
    }

    return this.toDto(settings);
  }

  async updateSettings(channelId: string, data: UpdateDiscordSettingsDto): Promise<DiscordSettingsDto> {
    const settings = await prisma.discordSettings.upsert({
      where: { channelId },
      create: {
        channelId,
        guildId: data.guildId ?? "",
        commandChannelId: data.commandChannelId ?? "",
        timerChannelId: data.timerChannelId ?? "",
        summaryChannelId: data.summaryChannelId ?? "",
        notifyChannelId: data.notifyChannelId ?? "",
        pointsChannelId: data.pointsChannelId ?? "",
        commandsEnabled: data.commandsEnabled ?? false,
        timersEnabled: data.timersEnabled ?? false,
        summariesEnabled: data.summariesEnabled ?? false,
        notificationsEnabled: data.notificationsEnabled ?? false,
        notifyFollow: data.notifyFollow ?? true,
        notifySub: data.notifySub ?? true,
        notifyGiftSub: data.notifyGiftSub ?? true,
        notifyRaid: data.notifyRaid ?? true,
        notifyHypeTrain: data.notifyHypeTrain ?? true,
        notifyStreamOnline: data.notifyStreamOnline ?? true,
        notifyStreamOffline: data.notifyStreamOffline ?? true,
      },
      update: {
        ...(data.guildId !== undefined && { guildId: data.guildId }),
        ...(data.commandChannelId !== undefined && { commandChannelId: data.commandChannelId }),
        ...(data.timerChannelId !== undefined && { timerChannelId: data.timerChannelId }),
        ...(data.summaryChannelId !== undefined && { summaryChannelId: data.summaryChannelId }),
        ...(data.notifyChannelId !== undefined && { notifyChannelId: data.notifyChannelId }),
        ...(data.pointsChannelId !== undefined && { pointsChannelId: data.pointsChannelId }),
        ...(data.commandsEnabled !== undefined && { commandsEnabled: data.commandsEnabled }),
        ...(data.timersEnabled !== undefined && { timersEnabled: data.timersEnabled }),
        ...(data.summariesEnabled !== undefined && { summariesEnabled: data.summariesEnabled }),
        ...(data.notificationsEnabled !== undefined && { notificationsEnabled: data.notificationsEnabled }),
        ...(data.notifyFollow !== undefined && { notifyFollow: data.notifyFollow }),
        ...(data.notifySub !== undefined && { notifySub: data.notifySub }),
        ...(data.notifyGiftSub !== undefined && { notifyGiftSub: data.notifyGiftSub }),
        ...(data.notifyRaid !== undefined && { notifyRaid: data.notifyRaid }),
        ...(data.notifyHypeTrain !== undefined && { notifyHypeTrain: data.notifyHypeTrain }),
        ...(data.notifyStreamOnline !== undefined && { notifyStreamOnline: data.notifyStreamOnline }),
        ...(data.notifyStreamOffline !== undefined && { notifyStreamOffline: data.notifyStreamOffline }),
      },
    });

    return this.toDto(settings);
  }

  private toDto(settings: any): DiscordSettingsDto {
    return {
      id: settings.id,
      channelId: settings.channelId,
      guildId: settings.guildId,
      commandChannelId: settings.commandChannelId,
      timerChannelId: settings.timerChannelId,
      summaryChannelId: settings.summaryChannelId,
      notifyChannelId: settings.notifyChannelId,
      pointsChannelId: settings.pointsChannelId ?? "",
      commandsEnabled: settings.commandsEnabled,
      timersEnabled: settings.timersEnabled,
      summariesEnabled: settings.summariesEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      notifyFollow: settings.notifyFollow ?? true,
      notifySub: settings.notifySub ?? true,
      notifyGiftSub: settings.notifyGiftSub ?? true,
      notifyRaid: settings.notifyRaid ?? true,
      notifyHypeTrain: settings.notifyHypeTrain ?? true,
      notifyStreamOnline: settings.notifyStreamOnline ?? true,
      notifyStreamOffline: settings.notifyStreamOffline ?? true,
      hasBotToken: !!config.discordBotToken,
      discordClientId: config.discordClientId,
    };
  }
}

export const discordService = new DiscordService();
