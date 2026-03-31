import cron from "node-cron";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { pointsService } from "../points/service.js";
import { emitToChannel } from "../../lib/socket.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { sendEmbedToDiscordChannel } from "../../discord/discord-client.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../lib/logger.js";

const BINGO_COST = 10;
const BINGO_NUMBERS = 30; // Numbers 1-30
const TICKET_SIZE = 5;    // 5 numbers per ticket
const DRAW_SIZE = 10;     // 10 winning numbers drawn

const PAYOUTS = {
  3: 25,    // 3 matches
  4: 100,   // 4 matches
  5: 500,   // 5 matches (BINGO!)
};

// Redis keys
function ticketKey(channelId: string): string {
  return `bingo:tickets:${channelId}`;
}
function drawKey(channelId: string): string {
  return `bingo:draw:${channelId}`;
}
function lastDrawKey(channelId: string): string {
  return `bingo:lastdraw:${channelId}`;
}

// Generate unique random numbers
function pickNumbers(count: number, max: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * max) + 1);
  }
  return [...nums].sort((a, b) => a - b);
}

// Buy a bingo ticket
export async function buyTicket(
  channelId: string,
  userId: string,
  displayName: string
): Promise<{ numbers: number[] } | { error: string }> {
  // Check if already has a ticket today
  const existing = await redis.hget(ticketKey(channelId), userId);
  if (existing) {
    const data = JSON.parse(existing);
    return { error: `Du hast schon ein Ticket! Deine Zahlen: ${data.numbers.join(", ")}` };
  }

  // Check points
  const user = await pointsService.getUserPoints(channelId, userId);
  if (!user || user.points < BINGO_COST) {
    return { error: `Nicht genug Punkte! Brauchst ${BINGO_COST}, hast ${user?.points ?? 0}.` };
  }

  // Deduct points
  await pointsService.deductPoints(channelId, userId, BINGO_COST);

  // Generate ticket
  const numbers = pickNumbers(TICKET_SIZE, BINGO_NUMBERS);
  await redis.hset(ticketKey(channelId), userId, JSON.stringify({ displayName, numbers }));

  // Set expiry for midnight+7h (next draw) if not already set
  const ttl = await redis.ttl(ticketKey(channelId));
  if (ttl < 0) {
    // Calculate seconds until next 7:00 AM CET
    const now = new Date();
    const next7am = new Date(now);
    next7am.setHours(7, 0, 0, 0);
    if (now >= next7am) next7am.setDate(next7am.getDate() + 1);
    const secondsUntil = Math.floor((next7am.getTime() - now.getTime()) / 1000) + 3600; // +1h buffer
    await redis.expire(ticketKey(channelId), secondsUntil);
  }

  return { numbers };
}

// Get last draw results
export async function getLastDraw(channelId: string): Promise<{ numbers: number[]; winners: { name: string; matches: number; payout: number }[] } | null> {
  const raw = await redis.get(lastDrawKey(channelId));
  if (!raw) return null;
  return JSON.parse(raw);
}

// Daily draw at 7:00 AM CET (6:00 UTC in winter, 5:00 UTC in summer)
export function initBingoScheduler(): void {
  // Run at 5:00 UTC (= 7:00 CEST) — adjust if needed
  cron.schedule("0 5 * * *", async () => {
    try {
      await runDailyDraw();
    } catch (err) {
      logger.error({ err }, "Bingo daily draw error");
    }
  });
  logger.info("Bingo scheduler started (daily at 05:00 UTC / 07:00 CEST)");
}

async function runDailyDraw(): Promise<void> {
  // Get all channels that have bingo tickets
  const allChannels = await prisma.channel.findMany({ select: { id: true, displayName: true } });

  for (const channel of allChannels) {
    const ticketsRaw = await redis.hgetall(ticketKey(channel.id));
    if (!ticketsRaw || Object.keys(ticketsRaw).length === 0) continue;

    // Draw winning numbers
    const winningNumbers = pickNumbers(DRAW_SIZE, BINGO_NUMBERS);

    // Check all tickets
    const winners: { userId: string; name: string; matches: number; payout: number }[] = [];

    for (const [userId, ticketJson] of Object.entries(ticketsRaw)) {
      const { displayName, numbers } = JSON.parse(ticketJson);
      const matches = numbers.filter((n: number) => winningNumbers.includes(n)).length;

      if (matches >= 3) {
        const payout = PAYOUTS[matches as keyof typeof PAYOUTS] ?? 0;
        if (payout > 0) {
          await pointsService.addMessagePoints(channel.id, userId, displayName, payout);
          winners.push({ userId, name: displayName, matches, payout });
        }
      }
    }

    const totalTickets = Object.keys(ticketsRaw).length;

    // Save last draw results
    await redis.set(lastDrawKey(channel.id), JSON.stringify({
      numbers: winningNumbers,
      winners: winners.map(w => ({ name: w.name, matches: w.matches, payout: w.payout })),
      totalTickets,
      drawnAt: new Date().toISOString(),
    }), "EX", 86400); // Keep for 24h

    // Announce in Twitch chat
    try {
      let msg = `🎱 BINGO ZIEHUNG! Gewinnzahlen: ${winningNumbers.join(", ")} | ${totalTickets} Tickets`;
      if (winners.length > 0) {
        const winnerStrs = winners
          .sort((a, b) => b.matches - a.matches)
          .map(w => `${w.name} (${w.matches}/5 → ${w.payout} Pts)`)
          .join(", ");
        msg += ` | Gewinner: ${winnerStrs}`;
      } else {
        msg += " | Keine Gewinner heute!";
      }
      sayInChannel(channel.displayName, msg);
    } catch {
      // Channel might not be joined
    }

    // Announce in Discord
    try {
      const settings = await prisma.discordSettings.findUnique({ where: { channelId: channel.id } });
      const discordChannel = settings?.pointsChannelId || settings?.notifyChannelId;
      if (settings && discordChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("🎱 Tägliche Bingo Ziehung")
          .setDescription(`**Gewinnzahlen:** ${winningNumbers.join(", ")}`)
          .addFields(
            { name: "Tickets", value: String(totalTickets), inline: true },
            { name: "Gewinner", value: String(winners.length), inline: true },
          )
          .setTimestamp();

        if (winners.length > 0) {
          const winnerList = winners
            .sort((a, b) => b.matches - a.matches)
            .map(w => `**${w.name}** — ${w.matches}/5 Treffer → ${w.payout} Punkte`)
            .join("\n");
          embed.addFields({ name: "🏆 Gewinner", value: winnerList });
        } else {
          embed.addFields({ name: "Ergebnis", value: "Keine Gewinner heute — morgen mehr Glück!" });
        }

        await sendEmbedToDiscordChannel(discordChannel, embed);
      }
    } catch {
      // Discord not available
    }

    // Clean up tickets
    await redis.del(ticketKey(channel.id));

    logger.info({
      channelId: channel.id,
      tickets: totalTickets,
      winners: winners.length,
      winningNumbers,
    }, "Bingo daily draw completed");
  }
}
