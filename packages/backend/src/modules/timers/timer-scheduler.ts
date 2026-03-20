import cron from "node-cron";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { sendToDiscordChannel } from "../../discord/discord-client.js";
import { logger } from "../../lib/logger.js";

const CHAT_LINES_KEY_PREFIX = "timer:lines:";
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

    // Check chat line threshold
    const linesKey = `${CHAT_LINES_KEY_PREFIX}${timer.channelId}`;
    const lines = parseInt((await redis.get(linesKey)) ?? "0", 10);
    if (lines < timer.minChatLines) continue;

    // Fire the timer (Twitch)
    if (timer.twitchEnabled) {
      sayInChannel(timer.channel.displayName, timer.message);
    }

    // Fire the timer (Discord)
    if (timer.discordEnabled) {
      try {
        const discordSettings = await prisma.discordSettings.findUnique({
          where: { channelId: timer.channelId },
        });
        if (discordSettings?.timersEnabled && discordSettings.timerChannelId) {
          sendToDiscordChannel(discordSettings.timerChannelId, timer.message).catch(() => {});
        }
      } catch {
        // Discord send is fire-and-forget
      }
    }

    await prisma.timer.update({
      where: { id: timer.id },
      data: { lastFiredAt: now },
    });

    // Reset chat line counter
    await redis.set(linesKey, "0");

    logger.debug({ timer: timer.name, channel: timer.channel.displayName }, "Timer fired");
  }
}

export async function incrementChatLines(channelId: string) {
  const key = `${CHAT_LINES_KEY_PREFIX}${channelId}`;
  await redis.incr(key);
}

export function rescheduleTimers() {
  // Timers are checked every minute via cron, no individual scheduling needed
  logger.debug("Timers will be re-evaluated on next check cycle");
}
