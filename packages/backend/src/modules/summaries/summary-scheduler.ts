import cron from "node-cron";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import { buildStreamSummary, buildSummaryEmbed } from "./summary-service.js";
import { sendEmbedToDiscordChannel } from "../../discord/discord-client.js";

const STREAM_START_KEY_PREFIX = "stream:start:";

export function initSummaryScheduler(): void {
  // Daily summary at 00:00 UTC
  cron.schedule("0 0 * * *", async () => {
    try {
      await postDailySummaries();
    } catch (err) {
      logger.error({ err }, "Daily summary scheduler error");
    }
  });
  logger.info("Summary scheduler started (daily at 00:00 UTC)");
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
    const summary = await buildStreamSummary(channelId, start, end);
    if (!summary) return;

    const embed = buildSummaryEmbed(summary, "Stream Summary");
    await sendEmbedToDiscordChannel(settings.summaryChannelId, embed);
    logger.info({ channelId }, "Stream-end summary posted to Discord");
  } catch (err) {
    logger.error({ err, channelId }, "Failed to post stream-end summary");
  }
}

async function postDailySummaries(): Promise<void> {
  const allSettings = await prisma.discordSettings.findMany({
    where: { summariesEnabled: true },
  });

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  for (const settings of allSettings) {
    if (!settings.summaryChannelId) continue;

    try {
      const summary = await buildStreamSummary(settings.channelId, start, end);
      if (!summary || summary.chatMessageCount === 0) continue;

      const embed = buildSummaryEmbed(summary, "Daily Summary (Last 24h)");
      await sendEmbedToDiscordChannel(settings.summaryChannelId, embed);
      logger.debug({ channelId: settings.channelId }, "Daily summary posted");
    } catch (err) {
      logger.error({ err, channelId: settings.channelId }, "Failed to post daily summary");
    }
  }
}
