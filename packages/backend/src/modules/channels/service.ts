import { prisma } from "../../lib/prisma.js";
import { joinChannel, leaveChannel } from "../../twitch/twitch-client.js";
import { getTwitchApi } from "../../twitch/twitch-api.js";
import type { ChannelDto } from "@streamguard/shared";

class ChannelService {
  async getChannelsForUser(userId: string): Promise<ChannelDto[]> {
    // Channels the user owns
    const owned = await prisma.channel.findMany({
      where: { ownerId: userId },
    });

    // Channels the user is an editor of
    const editorEntries = await prisma.channelEditor.findMany({
      where: { userId },
      include: { channel: true },
    });

    const editorChannels = editorEntries.map((e) => e.channel);
    const allChannels = [...owned, ...editorChannels];

    // Deduplicate
    const seen = new Set<string>();
    const unique = allChannels.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    return unique.map(this.toDto);
  }

  async getChannel(channelId: string, userId: string): Promise<ChannelDto> {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        id: channelId,
        OR: [
          { ownerId: userId },
          { editors: { some: { userId } } },
        ],
      },
    });
    return this.toDto(channel);
  }

  async addChannel(userId: string, twitchUsername: string): Promise<ChannelDto> {
    // Look up the Twitch user
    const api = getTwitchApi();
    const twitchUser = await api.users.getUserByName(twitchUsername);
    if (!twitchUser) {
      throw new Error(`Twitch user not found: ${twitchUsername}`);
    }

    // Create or get channel
    const channel = await prisma.channel.upsert({
      where: { twitchId: twitchUser.id },
      update: { displayName: twitchUser.displayName },
      create: {
        twitchId: twitchUser.id,
        displayName: twitchUser.displayName,
        ownerId: userId,
      },
    });

    // Ensure moderation settings exist
    await prisma.moderationSettings.upsert({
      where: { channelId: channel.id },
      update: {},
      create: { channelId: channel.id },
    });

    return this.toDto(channel);
  }

  async deleteChannel(channelId: string, userId: string): Promise<void> {
    const channel = await prisma.channel.findFirstOrThrow({
      where: { id: channelId, ownerId: userId },
    });

    // Leave channel if bot is joined
    if (channel.botJoined) {
      try {
        await leaveChannel(channel.displayName);
      } catch {
        // Ignore if bot can't leave
      }
    }

    await prisma.channel.delete({ where: { id: channelId } });
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
      where: {
        id: channelId,
        OR: [{ ownerId: userId }, { editors: { some: { userId } } }],
      },
    });
    await joinChannel(channel.displayName);
    await prisma.channel.update({
      where: { id: channelId },
      data: { botJoined: true },
    });
  }

  async leaveBot(channelId: string, userId: string): Promise<void> {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        id: channelId,
        OR: [{ ownerId: userId }, { editors: { some: { userId } } }],
      },
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
    overlayToken: string;
  }): ChannelDto {
    return {
      id: channel.id,
      twitchId: channel.twitchId,
      displayName: channel.displayName,
      botJoined: channel.botJoined,
      commandPrefix: channel.commandPrefix,
      overlayToken: channel.overlayToken,
    };
  }
}

export const channelService = new ChannelService();
