import cron from "node-cron";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { sendToDiscordChannel } from "../../discord/discord-client.js";
import { logger } from "../../lib/logger.js";

const CHAT_LINES_KEY_PREFIX = "timer:lines:";
const DISCORD_LINES_KEY_PREFIX = "timer:discord-lines:";
const scheduledTasks = new Map<string, cron.ScheduledTask>();

export function initTimerScheduler() {
  // Check timers every minute
  cron.schedule("* * * * *", async () => {
    try {
      await checkTimers();
    } catch (err) {
      logger.error(err, "Timer scheduler error");
    }
  });
  logger.info("Timer scheduler started");
}

async function checkTimers() {
  const timers = await prisma.timer.findMany({
    where: { enabled: true },
    include: { channel: true },
  });

  const now = new Date();

  for (const timer of timers) {
    if (!timer.channel.botJoined) continue;

    // Check if enough time has passed
    const lastFired = timer.lastFiredAt ?? timer.createdAt;
    const minutesSince = (now.getTime() - lastFired.getTime()) / 60000;
    if (minutesSince < timer.intervalMinutes) continue;

    // Check chat line thresholds per platform
    const twitchLinesKey = `${CHAT_LINES_KEY_PREFIX}${timer.channelId}`;
    const discordLinesKey = `${DISCORD_LINES_KEY_PREFIX}${timer.channelId}`;
    const twitchLines = parseInt((await redis.get(twitchLinesKey)) ?? "0", 10);
    const discordLines = parseInt((await redis.get(discordLinesKey)) ?? "0", 10);

    const twitchReady = !timer.twitchEnabled || twitchLines >= timer.minChatLines;
    const discordReady = !timer.discordEnabled || discordLines >= timer.minChatLines;

    // At least one enabled platform must meet the threshold
    if (timer.twitchEnabled && !twitchReady && timer.discordEnabled && !discordReady) continue;
    if (timer.twitchEnabled && !timer.discordEnabled && !twitchReady) continue;
    if (timer.discordEnabled && !timer.twitchEnabled && !discordReady) continue;

    let fired = false;

    // Fire the timer (Twitch) — only if Twitch chat was active enough
    if (timer.twitchEnabled && twitchReady) {
      sayInChannel(timer.channel.displayName, timer.message);
      fired = true;
    }

    // Fire the timer (Discord) — only if Discord chat was active enough
    if (timer.discordEnabled && discordReady) {
      try {
        const discordSettings = await prisma.discordSettings.findUnique({
          where: { channelId: timer.channelId },
        });
        if (discordSettings?.timersEnabled && discordSettings.timerChannelId) {
          sendToDiscordChannel(discordSettings.timerChannelId, timer.message).catch(() => {});
          fired = true;
        }
      } catch {
        // Discord send is fire-and-forget
      }
    }

    if (!fired) continue;

    await prisma.timer.update({
      where: { id: timer.id },
      data: { lastFiredAt: now },
    });

    // Reset counters for platforms that fired
    if (timer.twitchEnabled && twitchReady) await redis.set(twitchLinesKey, "0");
    if (timer.discordEnabled && discordReady) await redis.set(discordLinesKey, "0");

    logger.debug({ timer: timer.name, channel: timer.channel.displayName }, "Timer fired");
  }
}

export async function incrementChatLines(channelId: string) {
  const key = `${CHAT_LINES_KEY_PREFIX}${channelId}`;
  await redis.incr(key);
}

export async function incrementDiscordLines(channelId: string) {
  const key = `${DISCORD_LINES_KEY_PREFIX}${channelId}`;
  await redis.incr(key);
}

export function rescheduleTimers() {
  // Timers are checked every minute via cron, no individual scheduling needed
  logger.debug("Timers will be re-evaluated on next check cycle");
}
