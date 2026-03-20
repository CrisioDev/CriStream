import cron from "node-cron";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import { buildStreamSummary, buildSummaryEmbed } from "./summary-service.js";
import { summarizeDiscordChat } from "./discord-summary-service.js";
import { sendEmbedToDiscordChannel } from "../../discord/discord-client.js";

const STREAM_START_KEY_PREFIX = "stream:start:";

export function initSummaryScheduler(): void {
  // Daily summary at 22:00 UTC (00:00 CEST)
  cron.schedule("0 22 * * *", async () => {
    try {
      await postDailySummaries();
    } catch (err) {
      logger.error({ err }, "Daily summary scheduler error");
    }
  });
  logger.info("Summary scheduler started (daily at 22:00 UTC)");
}

export async function onStreamOnline(channelId: string): Promise<void> {
  const key = `${STREAM_START_KEY_PREFIX}${channelId}`;
  await redis.set(key, new Date().toISOString());
  logger.debug({ channelId }, "Stream start time recorded");
}

export async function onStreamOffline(channelId: string): Promise<void> {
  const key = `${STREAM_START_KEY_PREFIX}${channelId}`;
  const startStr = await redis.get(key);

  if (!startStr) {
    logger.debug({ channelId }, "No stream start time found for summary");
    return;
  }

  const start = new Date(startStr);
  const end = new Date();

  await redis.del(key);

  // Check if summaries are enabled for this channel
  const settings = await prisma.discordSettings.findUnique({
    where: { channelId },
  });

  if (!settings?.summariesEnabled || !settings.summaryChannelId) return;

  try {
    // Stream summary (Twitch stats)
    const summary = await buildStreamSummary(channelId, start, end);
    if (summary) {
      const embed = buildSummaryEmbed(summary, "Stream Summary");
      await sendEmbedToDiscordChannel(settings.summaryChannelId, embed);
    }

    // Discord chat summary (AI)
    if (settings.guildId) {
      const streamHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
      const discordEmbed = await summarizeDiscordChat(settings.guildId, Math.ceil(streamHours));
      if (discordEmbed) {
        await sendEmbedToDiscordChannel(settings.summaryChannelId, discordEmbed);
      }
    }

    logger.info({ channelId }, "Stream-end summaries posted to Discord");
  } catch (err) {
    logger.error({ err, channelId }, "Failed to post stream-end summary");
  }
}

async function postDailySummaries(): Promise<void> {
  const allSettings = await prisma.discordSettings.findMany({
    where: { summariesEnabled: true },
  });

  for (const settings of allSettings) {
    if (!settings.summaryChannelId) continue;

    try {
      // Twitch daily summary
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const summary = await buildStreamSummary(settings.channelId, start, end);
      if (summary && summary.chatMessageCount > 0) {
        const embed = buildSummaryEmbed(summary, "Twitch Daily Summary (24h)");
        await sendEmbedToDiscordChannel(settings.summaryChannelId, embed);
      }

      // Discord chat AI summary
      if (settings.guildId) {
        const discordEmbed = await summarizeDiscordChat(settings.guildId, 24);
        if (discordEmbed) {
          await sendEmbedToDiscordChannel(settings.summaryChannelId, discordEmbed);
        }
      }

      logger.debug({ channelId: settings.channelId }, "Daily summaries posted");
    } catch (err) {
      logger.error({ err, channelId: settings.channelId }, "Failed to post daily summary");
    }
  }
}
