import { prisma } from "../../lib/prisma.js";
import type { DiscordSettingsDto, UpdateDiscordSettingsDto } from "@streamguard/shared";
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
        commandsEnabled: false,
        timersEnabled: false,
        summariesEnabled: false,
        notificationsEnabled: false,
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
        commandsEnabled: data.commandsEnabled ?? false,
        timersEnabled: data.timersEnabled ?? false,
        summariesEnabled: data.summariesEnabled ?? false,
        notificationsEnabled: data.notificationsEnabled ?? false,
      },
      update: {
        ...(data.guildId !== undefined && { guildId: data.guildId }),
        ...(data.commandChannelId !== undefined && { commandChannelId: data.commandChannelId }),
        ...(data.timerChannelId !== undefined && { timerChannelId: data.timerChannelId }),
        ...(data.summaryChannelId !== undefined && { summaryChannelId: data.summaryChannelId }),
        ...(data.notifyChannelId !== undefined && { notifyChannelId: data.notifyChannelId }),
        ...(data.commandsEnabled !== undefined && { commandsEnabled: data.commandsEnabled }),
        ...(data.timersEnabled !== undefined && { timersEnabled: data.timersEnabled }),
        ...(data.summariesEnabled !== undefined && { summariesEnabled: data.summariesEnabled }),
        ...(data.notificationsEnabled !== undefined && { notificationsEnabled: data.notificationsEnabled }),
      },
    });

    return this.toDto(settings);
  }

  private toDto(settings: {
    id: string;
    channelId: string;
    guildId: string;
    commandChannelId: string;
    timerChannelId: string;
    summaryChannelId: string;
    notifyChannelId: string;
    commandsEnabled: boolean;
    timersEnabled: boolean;
    summariesEnabled: boolean;
    notificationsEnabled: boolean;
  }): DiscordSettingsDto {
    return {
      id: settings.id,
      channelId: settings.channelId,
      guildId: settings.guildId,
      commandChannelId: settings.commandChannelId,
      timerChannelId: settings.timerChannelId,
      summaryChannelId: settings.summaryChannelId,
      notifyChannelId: settings.notifyChannelId,
      commandsEnabled: settings.commandsEnabled,
      timersEnabled: settings.timersEnabled,
      summariesEnabled: settings.summariesEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      hasBotToken: !!config.discordBotToken,
      discordClientId: config.discordClientId,
    };
  }
}

export const discordService = new DiscordService();
