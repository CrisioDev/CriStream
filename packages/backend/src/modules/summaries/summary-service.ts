import { EmbedBuilder } from "discord.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

interface SummaryData {
  channelName: string;
  start: Date;
  end: Date;
  chatMessageCount: number;
  uniqueChatters: number;
  topCommands: Array<{ trigger: string; count: number }>;
  followCount: number;
  subCount: number;
  giftSubCount: number;
  raidCount: number;
}

export async function buildStreamSummary(
  channelId: string,
  start: Date,
  end: Date
): Promise<SummaryData | null> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return null;

  // Chat stats
  const chatLogs = await prisma.chatLog.findMany({
    where: { channelId, createdAt: { gte: start, lte: end } },
    select: { twitchUserId: true },
  });

  const uniqueChatters = new Set(chatLogs.map((l) => l.twitchUserId)).size;

  // Top commands from event logs
  const commandEvents = await prisma.eventLog.findMany({
    where: {
      channelId,
      eventType: "command",
      createdAt: { gte: start, lte: end },
    },
  });

  // Since commands don't go through EventLog, count from use counts isn't time-scoped.
  // Use ChatLog keyword approach or just show overall top commands
  const commands = await prisma.command.findMany({
    where: { channelId, enabled: true },
    orderBy: { useCount: "desc" },
    take: 5,
  });

  // Event counts
  const events = await prisma.eventLog.findMany({
    where: { channelId, createdAt: { gte: start, lte: end } },
    select: { eventType: true, data: true },
  });

  let followCount = 0;
  let subCount = 0;
  let giftSubCount = 0;
  let raidCount = 0;

  for (const e of events) {
    switch (e.eventType) {
      case "channel.follow":
        followCount++;
        break;
      case "channel.subscribe":
        subCount++;
        break;
      case "channel.subscription.gift":
        giftSubCount += (e.data as any)?.total ?? 1;
        break;
      case "channel.raid":
        raidCount++;
        break;
    }
  }

  return {
    channelName: channel.displayName,
    start,
    end,
    chatMessageCount: chatLogs.length,
    uniqueChatters,
    topCommands: commands.map((c) => ({ trigger: c.trigger, count: c.useCount })),
    followCount,
    subCount,
    giftSubCount,
    raidCount,
  };
}

export function buildSummaryEmbed(data: SummaryData, title: string): EmbedBuilder {
  const duration = Math.round((data.end.getTime() - data.start.getTime()) / 60000);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const embed = new EmbedBuilder()
    .setColor(0x9146ff)
    .setTitle(title)
    .setDescription(`Stream summary for **${data.channelName}**`)
    .addFields(
      {
        name: "Duration",
        value: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        inline: true,
      },
      { name: "Chat Messages", value: String(data.chatMessageCount), inline: true },
      { name: "Unique Chatters", value: String(data.uniqueChatters), inline: true }
    )
    .setTimestamp();

  // Events
  const eventLines: string[] = [];
  if (data.followCount > 0) eventLines.push(`Follows: **${data.followCount}**`);
  if (data.subCount > 0) eventLines.push(`Subs: **${data.subCount}**`);
  if (data.giftSubCount > 0) eventLines.push(`Gift Subs: **${data.giftSubCount}**`);
  if (data.raidCount > 0) eventLines.push(`Raids: **${data.raidCount}**`);

  if (eventLines.length > 0) {
    embed.addFields({ name: "Events", value: eventLines.join("\n") });
  }

  // Top commands
  if (data.topCommands.length > 0) {
    const cmdList = data.topCommands
      .map((c, i) => `${i + 1}. \`!${c.trigger}\` (${c.count} uses)`)
      .join("\n");
    embed.addFields({ name: "Top Commands", value: cmdList });
  }

  return embed;
}
