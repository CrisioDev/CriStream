import { prisma } from "../../lib/prisma.js";
import { joinChannel, leaveChannel } from "../../twitch/twitch-client.js";
import type { ChannelDto } from "@streamguard/shared";

class ChannelService {
  async getChannelsForUser(userId: string): Promise<ChannelDto[]> {
    const channels = await prisma.channel.findMany({
      where: { ownerId: userId },
    });
    return channels.map(this.toDto);
  }

  async getChannel(channelId: string, userId: string): Promise<ChannelDto> {
    const channel = await prisma.channel.findFirstOrThrow({
      where: { id: channelId, ownerId: userId },
    });
    return this.toDto(channel);
  }

  async updateChannel(
    channelId: string,
    userId: string,
    data: { commandPrefix?: string }
  ): Promise<ChannelDto> {
    const channel = await prisma.channel.update({
      where: { id: channelId, ownerId: userId },
      data,
    });
    return this.toDto(channel);
  }

  async joinBot(channelId: string, userId: string): Promise<void> {
    const channel = await prisma.channel.findFirstOrThrow({
      where: { id: channelId, ownerId: userId },
    });
    await joinChannel(channel.displayName);
    await prisma.channel.update({
      where: { id: channelId },
      data: { botJoined: true },
    });
  }

  async leaveBot(channelId: string, userId: string): Promise<void> {
    const channel = await prisma.channel.findFirstOrThrow({
      where: { id: channelId, ownerId: userId },
    });
    await leaveChannel(channel.displayName);
    await prisma.channel.update({
      where: { id: channelId },
      data: { botJoined: false },
    });
  }

  private toDto(channel: {
    id: string;
    twitchId: string;
    displayName: string;
    botJoined: boolean;
    commandPrefix: string;
  }): ChannelDto {
    return {
      id: channel.id,
      twitchId: channel.twitchId,
      displayName: channel.displayName,
      botJoined: channel.botJoined,
      commandPrefix: channel.commandPrefix,
    };
  }
}

export const channelService = new ChannelService();
