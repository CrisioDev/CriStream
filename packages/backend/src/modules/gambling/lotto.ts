import cron from "node-cron";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { pointsService } from "../points/service.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { sendEmbedToDiscordChannel } from "../../discord/discord-client.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../lib/logger.js";

const LOTTO_COST = 50;
const LOTTO_NUMBERS = 49;  // Numbers 1-49
const TICKET_SIZE = 6;     // 6 numbers per ticket
const DRAW_SIZE = 6;       // 6 winning numbers

const PAYOUTS: Record<number, number> = {
  3: 100,     // 3 Richtige
  4: 500,     // 4 Richtige
  5: 2500,    // 5 Richtige
  6: 10000,   // 6 Richtige — JACKPOT!
};

function lottoTicketKey(channelId: string): string {
  return `lotto:tickets:${channelId}`;
}
function lastLottoDrawKey(channelId: string): string {
  return `lotto:lastdraw:${channelId}`;
}

function pickNumbers(count: number, max: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * max) + 1);
  }
  return [...nums].sort((a, b) => a - b);
}

export async function buyLottoTicket(
  channelId: string,
  userId: string,
  displayName: string
): Promise<{ numbers: number[] } | { error: string }> {
  const existing = await redis.hget(lottoTicketKey(channelId), userId);
  if (existing) {
    const data = JSON.parse(existing);
    return { error: `Du hast schon einen Lottoschein! Deine Zahlen: ${data.numbers.join(", ")}` };
  }

  const user = await pointsService.getUserPoints(channelId, userId);
  if (!user || user.points < LOTTO_COST) {
    return { error: `Nicht genug Punkte! Brauchst ${LOTTO_COST}, hast ${user?.points ?? 0}.` };
  }

  await pointsService.deductPoints(channelId, userId, LOTTO_COST);

  const numbers = pickNumbers(TICKET_SIZE, LOTTO_NUMBERS);
  await redis.hset(lottoTicketKey(channelId), userId, JSON.stringify({ displayName, numbers }));

  // Set TTL to expire after next Sunday 10:00
  const ttl = await redis.ttl(lottoTicketKey(channelId));
  if (ttl < 0) {
    await redis.expire(lottoTicketKey(channelId), 7 * 86400 + 3600);
  }

  return { numbers };
}

export async function getLastLottoDraw(channelId: string): Promise<any | null> {
  const raw = await redis.get(lastLottoDrawKey(channelId));
  if (!raw) return null;
  return JSON.parse(raw);
}

// Weekly draw: Sunday 8:00 UTC = 10:00 CEST
export function initLottoScheduler(): void {
  cron.schedule("0 8 * * 0", async () => {
    try {
      await runLottoDraw();
    } catch (err) {
      logger.error({ err }, "Lotto weekly draw error");
    }
  });
  logger.info("Lotto scheduler started (Sunday 08:00 UTC / 10:00 CEST)");
}

async function runLottoDraw(): Promise<void> {
  const allChannels = await prisma.channel.findMany({ select: { id: true, displayName: true } });

  for (const channel of allChannels) {
    const ticketsRaw = await redis.hgetall(lottoTicketKey(channel.id));
    if (!ticketsRaw || Object.keys(ticketsRaw).length === 0) continue;

    const winningNumbers = pickNumbers(DRAW_SIZE, LOTTO_NUMBERS);
    const winners: { userId: string; name: string; matches: number; payout: number }[] = [];

    for (const [userId, ticketJson] of Object.entries(ticketsRaw)) {
      const { displayName, numbers } = JSON.parse(ticketJson);
      const matches = numbers.filter((n: number) => winningNumbers.includes(n)).length;

      if (matches >= 3) {
        const payout = PAYOUTS[matches] ?? 0;
        if (payout > 0) {
          await pointsService.addMessagePoints(channel.id, userId, displayName, payout);
          winners.push({ userId, name: displayName, matches, payout });
        }
      }
    }

    const totalTickets = Object.keys(ticketsRaw).length;

    // Save results
    await redis.set(lastLottoDrawKey(channel.id), JSON.stringify({
      numbers: winningNumbers,
      winners: winners.map(w => ({ name: w.name, matches: w.matches, payout: w.payout })),
      totalTickets,
      drawnAt: new Date().toISOString(),
    }), "EX", 7 * 86400);

    // Announce Twitch
    try {
      let msg = `🍀 LOTTO ZIEHUNG! Gewinnzahlen: ${winningNumbers.join(", ")} | ${totalTickets} Scheine`;
      if (winners.length > 0) {
        const winnerStrs = winners
          .sort((a, b) => b.matches - a.matches)
          .map(w => `${w.name} (${w.matches}/6 → ${w.payout} Pts)`)
          .join(", ");
        msg += ` | Gewinner: ${winnerStrs}`;
      } else {
        msg += " | Kein Gewinner diese Woche!";
      }
      sayInChannel(channel.displayName, msg);
    } catch { /* channel not joined */ }

    // Announce Discord
    try {
      const settings = await prisma.discordSettings.findUnique({ where: { channelId: channel.id } });
      const discordChannel = settings?.pointsChannelId || settings?.notifyChannelId;
      if (settings && discordChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x00cc00)
          .setTitle("🍀 Wöchentliche Lotto Ziehung")
          .setDescription(`**Gewinnzahlen:** ${winningNumbers.join(", ")}`)
          .addFields(
            { name: "Scheine", value: String(totalTickets), inline: true },
            { name: "Gewinner", value: String(winners.length), inline: true },
          )
          .setTimestamp();

        if (winners.length > 0) {
          const winnerList = winners
            .sort((a, b) => b.matches - a.matches)
            .map(w => `**${w.name}** — ${w.matches}/6 Richtige → ${w.payout} Punkte`)
            .join("\n");
          embed.addFields({ name: "🏆 Gewinner", value: winnerList });
        }

        await sendEmbedToDiscordChannel(discordChannel, embed);
      }
    } catch { /* Discord not available */ }

    await redis.del(lottoTicketKey(channel.id));
    logger.info({ channelId: channel.id, tickets: totalTickets, winners: winners.length }, "Lotto draw completed");
  }
}
