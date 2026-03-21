import { EmbedBuilder } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { sendEmbedToDiscordChannel } from "./discord-client.js";

export async function notifyDiscordEvent(
  channelId: string,
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  const settings = await prisma.discordSettings.findUnique({
    where: { channelId },
    include: { channel: true },
  });

  if (!settings?.notificationsEnabled || !settings.notifyChannelId) return;

  // Check per-event toggles
  const eventToggleMap: Record<string, boolean> = {
    "channel.follow": settings.notifyFollow,
    "channel.subscribe": settings.notifySub,
    "channel.subscription.gift": settings.notifyGiftSub,
    "channel.raid": settings.notifyRaid,
    "channel.hype_train.begin": settings.notifyHypeTrain,
    "stream.online": settings.notifyStreamOnline,
    "stream.offline": settings.notifyStreamOffline,
  };
  if (eventToggleMap[eventType] === false) return;

  const channelName = settings.channel.displayName;
  let embed: EmbedBuilder | null = null;

  switch (eventType) {
    case "channel.follow":
      embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("New Follower")
        .setDescription(`**${data.user_name ?? "Someone"}** followed **${channelName}**!`)
        .setTimestamp();
      break;

    case "channel.subscribe":
      embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("New Subscriber")
        .setDescription(`**${data.user_name ?? "Someone"}** subscribed to **${channelName}**!`)
        .addFields({ name: "Tier", value: formatTier(data.tier), inline: true })
        .setTimestamp();
      break;

    case "channel.subscription.gift":
      embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("Gift Subs")
        .setDescription(
          `**${data.user_name ?? "Anonymous"}** gifted **${data.total ?? 1}** subs to **${channelName}**!`
        )
        .addFields({ name: "Tier", value: formatTier(data.tier), inline: true })
        .setTimestamp();
      break;

    case "channel.raid":
      embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle("Incoming Raid")
        .setDescription(
          `**${data.from_broadcaster_user_name ?? "Someone"}** is raiding with **${data.viewers ?? 0}** viewers!`
        )
        .setTimestamp();
      break;

    case "channel.hype_train.begin":
      embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle("Hype Train Started!")
        .setDescription(`A Hype Train has started on **${channelName}**! Level: ${data.level ?? 1}`)
        .setTimestamp();
      break;

    case "stream.online":
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Stream is LIVE!")
        .setDescription(`**${channelName}** just went live on Twitch!`)
        .setURL(`https://twitch.tv/${channelName.toLowerCase()}`)
        .setTimestamp();
      break;

    case "stream.offline":
      embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle("Stream Ended")
        .setDescription(`**${channelName}** has ended the stream.`)
        .setTimestamp();
      break;

    default:
      return;
  }

  if (embed) {
    await sendEmbedToDiscordChannel(settings.notifyChannelId, embed);
    logger.debug({ channelId, eventType }, "Discord notification sent");
  }
}

function formatTier(tier: string | undefined): string {
  switch (tier) {
    case "1000":
      return "Tier 1";
    case "2000":
      return "Tier 2";
    case "3000":
      return "Tier 3";
    default:
      return "Tier 1";
  }
}
