import { registerHandler } from "../../twitch/message-handler.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { pointsService } from "../points/service.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import type { MessageContext } from "../../twitch/message-handler.js";

// ── Free plays: 10 per game per day ──
async function useFreePlay(channelId: string, userId: string, game: string): Promise<boolean> {
  const key = `free:${game}:${channelId}:${userId}`;
  const count = await redis.get(key);
  if (count && parseInt(count) >= 10) return false;
  await redis.incr(key);
  // Expire at next midnight CET (roughly)
  const ttl = await redis.ttl(key);
  if (ttl < 0) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    await redis.expire(key, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  }
  return true;
}

async function getFreeCount(channelId: string, userId: string, game: string): Promise<number> {
  const count = await redis.get(`free:${game}:${channelId}:${userId}`);
  return 10 - (count ? parseInt(count) : 0);
}

// ── Slot Machine ──
// Cost: 20 points (was 25) | Higher payouts

const SLOT_COST = 20;
const SLOT_COOLDOWN = 8;

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
const SLOT_WEIGHTS = [22, 20, 18, 15, 12, 8, 5]; // More balanced, rarer symbols more likely

function spinReel(): string {
  const total = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    roll -= SLOT_WEIGHTS[i]!;
    if (roll <= 0) return SLOT_SYMBOLS[i]!;
  }
  return SLOT_SYMBOLS[0]!;
}

function getSlotPayout(a: string, b: string, c: string): { payout: number; label: string } {
  if (a === b && b === c) {
    switch (a) {
      case "7️⃣": return { payout: 777, label: "🎰 JACKPOT 777!!!" };
      case "💎": return { payout: 350, label: "💎 DIAMANT TRIPLE!" };
      case "⭐": return { payout: 175, label: "⭐ STERN TRIPLE!" };
      case "🍇": return { payout: 90, label: "🍇 TRIPLE!" };
      case "🍊": return { payout: 70, label: "🍊 TRIPLE!" };
      case "🍋": return { payout: 55, label: "🍋 TRIPLE!" };
      case "🍒": return { payout: 45, label: "🍒 TRIPLE!" };
      default: return { payout: 55, label: "TRIPLE!" };
    }
  }
  if (a === b || b === c || a === c) {
    return { payout: 30, label: "Doppelt!" };
  }
  return { payout: 12, label: "Trostpreis" };
}

// ── Scratch Card ──
// Cost: 40 points (was 50) | Higher payouts

const SCRATCH_COST = 40;
const SCRATCH_COOLDOWN = 12;

const SCRATCH_SYMBOLS = ["🍀", "💰", "🎁", "👑", "💎", "🌟"];
const SCRATCH_WEIGHTS = [28, 24, 20, 14, 9, 5]; // More balanced

function pickScratchSymbol(): string {
  const total = SCRATCH_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < SCRATCH_SYMBOLS.length; i++) {
    roll -= SCRATCH_WEIGHTS[i]!;
    if (roll <= 0) return SCRATCH_SYMBOLS[i]!;
  }
  return SCRATCH_SYMBOLS[0]!;
}

function getScratchPayout(symbols: string[]): { payout: number; label: string } {
  const counts = new Map<string, number>();
  for (const s of symbols) counts.set(s, (counts.get(s) ?? 0) + 1);

  for (const [sym, count] of counts) {
    if (count === 3) {
      switch (sym) {
        case "🌟": return { payout: 1000, label: "🌟🌟🌟 MEGA GEWINN!!!" };
        case "💎": return { payout: 500, label: "💎💎💎 DIAMANT GEWINN!" };
        case "👑": return { payout: 300, label: "👑👑👑 KÖNIGLICH!" };
        case "🎁": return { payout: 175, label: "🎁🎁🎁 GESCHENK!" };
        case "💰": return { payout: 120, label: "💰💰💰 GELDREGEN!" };
        case "🍀": return { payout: 85, label: "🍀🍀🍀 GLÜCKSKLEE!" };
        default: return { payout: 85, label: "DREIER!" };
      }
    }
  }

  for (const [, count] of counts) {
    if (count === 2) return { payout: 40, label: "Zweier!" };
  }

  return { payout: 20, label: "Trostpreis" };
}

// ── Register Handler ──

registerHandler("gambling", 41, async (ctx: MessageContext) => {
  if (!ctx.channelId) return;

  const channel = await prisma.channel.findUnique({ where: { id: ctx.channelId } });
  if (!channel) return;

  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(prefix)) return;

  const parts = ctx.message.slice(prefix.length).trim().split(/\s+/);
  const cmd = parts[0]!.toLowerCase();
  const userId = ctx.msg.userInfo.userId;

  // ── !slots ──
  if (cmd === "slots" || cmd === "slot") {
    const cdKey = `cd:${ctx.channelId}:slots:${userId}`;
    const cdSet = await redis.set(cdKey, "1", "EX", SLOT_COOLDOWN, "NX");
    if (!cdSet) { sayInChannel(ctx.channel, `@${ctx.user} Slots auf Cooldown!`); ctx.handled = true; return; }

    // Free play or paid
    const free = await useFreePlay(ctx.channelId, userId, "slots");
    if (!free) {
      const user = await pointsService.getUserPoints(ctx.channelId, userId);
      if (!user || user.points < SLOT_COST) {
        await redis.del(cdKey);
        sayInChannel(ctx.channel, `@${ctx.user} Keine Gratis-Spins mehr & nicht genug Punkte (${SLOT_COST} nötig)`);
        ctx.handled = true; return;
      }
      await pointsService.deductPoints(ctx.channelId, userId, SLOT_COST);
    }

    const r1 = spinReel(), r2 = spinReel(), r3 = spinReel();
    const { payout, label } = getSlotPayout(r1, r2, r3);
    if (payout > 0) await pointsService.addMessagePoints(ctx.channelId, userId, ctx.user, payout);

    const cost = free ? 0 : SLOT_COST;
    const profit = payout - cost;
    const freeLeft = await getFreeCount(ctx.channelId, userId, "slots");
    const freeTag = free ? ` [GRATIS · ${freeLeft} übrig]` : "";

    sayInChannel(ctx.channel, `🎰 ${ctx.user} ▸ [ ${r1} | ${r2} | ${r3} ] ▸ ${label} → ${payout} Punkte (${profit >= 0 ? "+" : ""}${profit})${freeTag}`);
    ctx.handled = true;
    return;
  }

  // ── !rubbellos ──
  if (cmd === "rubbellos" || cmd === "scratch" || cmd === "rubbel") {
    const cdKey = `cd:${ctx.channelId}:scratch:${userId}`;
    const cdSet = await redis.set(cdKey, "1", "EX", SCRATCH_COOLDOWN, "NX");
    if (!cdSet) { sayInChannel(ctx.channel, `@${ctx.user} Rubbellos auf Cooldown!`); ctx.handled = true; return; }

    const free = await useFreePlay(ctx.channelId, userId, "scratch");
    if (!free) {
      const user = await pointsService.getUserPoints(ctx.channelId, userId);
      if (!user || user.points < SCRATCH_COST) {
        await redis.del(cdKey);
        sayInChannel(ctx.channel, `@${ctx.user} Keine Gratis-Lose mehr & nicht genug Punkte (${SCRATCH_COST} nötig)`);
        ctx.handled = true; return;
      }
      await pointsService.deductPoints(ctx.channelId, userId, SCRATCH_COST);
    }

    const s1 = pickScratchSymbol(), s2 = pickScratchSymbol(), s3 = pickScratchSymbol();
    const { payout, label } = getScratchPayout([s1, s2, s3]);
    if (payout > 0) await pointsService.addMessagePoints(ctx.channelId, userId, ctx.user, payout);

    const cost = free ? 0 : SCRATCH_COST;
    const profit = payout - cost;
    const freeLeft = await getFreeCount(ctx.channelId, userId, "scratch");
    const freeTag = free ? ` [GRATIS · ${freeLeft} übrig]` : "";

    sayInChannel(ctx.channel, `🎟️ ${ctx.user} kratzt... ${s1} ${s2} ${s3} ▸ ${label} → ${payout} Punkte (${profit >= 0 ? "+" : ""}${profit})${freeTag}`);
    ctx.handled = true;
    return;
  }

  // ── !casino ──
  if (cmd === "casino") {
    const { config } = await import("../../config/index.js");
    const baseUrl = config.publicUrl.replace(/\/$/, "");
    sayInChannel(ctx.channel, `🎰 CriStream Casino: ${baseUrl}/casino — Flip, Slots, Rubbellos, Bingo & Lotto!`);
    ctx.handled = true;
    return;
  }

  // ── !bingo ──
  if (cmd === "bingo") {
    const { buyTicket, getLastDraw } = await import("./bingo.js");
    const arg = parts[1]?.toLowerCase();
    if (arg === "ergebnis" || arg === "result") {
      const draw = await getLastDraw(ctx.channelId);
      if (!draw) { sayInChannel(ctx.channel, `@${ctx.user} Noch keine Ziehung!`); }
      else {
        const winStr = draw.winners.length > 0 ? draw.winners.map((w: any) => `${w.name} (${w.matches}/5)`).join(", ") : "Keine";
        sayInChannel(ctx.channel, `🎱 Letzte Ziehung: ${draw.numbers.join(", ")} | Gewinner: ${winStr}`);
      }
      ctx.handled = true; return;
    }
    const result = await buyTicket(ctx.channelId, userId, ctx.user);
    if ("error" in result) sayInChannel(ctx.channel, `@${ctx.user} ${result.error}`);
    else sayInChannel(ctx.channel, `🎱 @${ctx.user} Bingo-Ticket gekauft! Deine Zahlen: ${result.numbers.join(", ")} | Ziehung täglich 07:00`);
    ctx.handled = true;
    return;
  }

  // ── !lotto ──
  if (cmd === "lotto") {
    const { buyLottoTicket, getLastLottoDraw } = await import("./lotto.js");
    const arg = parts[1]?.toLowerCase();
    if (arg === "ergebnis" || arg === "result") {
      const draw = await getLastLottoDraw(ctx.channelId);
      if (!draw) { sayInChannel(ctx.channel, `@${ctx.user} Noch keine Ziehung!`); }
      else {
        const winStr = draw.winners.length > 0 ? draw.winners.map((w: any) => `${w.name} (${w.matches}/6)`).join(", ") : "Keine";
        sayInChannel(ctx.channel, `🍀 Letzte Lotto-Ziehung: ${draw.numbers.join(", ")} | Gewinner: ${winStr}`);
      }
      ctx.handled = true; return;
    }
    const result = await buyLottoTicket(ctx.channelId, userId, ctx.user);
    if ("error" in result) sayInChannel(ctx.channel, `@${ctx.user} ${result.error}`);
    else sayInChannel(ctx.channel, `🍀 @${ctx.user} Lottoschein gekauft! Deine Zahlen: ${result.numbers.join(", ")} | Ziehung Sonntag 10:00`);
    ctx.handled = true;
    return;
  }

  // ── !flip ──
  if (cmd === "flip" || cmd === "münze" || cmd === "coinflip") {
    const free = await useFreePlay(ctx.channelId, userId, "flip");
    if (!free) {
      const user = await pointsService.getUserPoints(ctx.channelId, userId);
      if (!user || user.points < 1) {
        sayInChannel(ctx.channel, `@${ctx.user} Keine Gratis-Flips mehr & keine Punkte!`);
        ctx.handled = true; return;
      }
      await pointsService.deductPoints(ctx.channelId, userId, 1);
    }

    const win = Math.random() < 0.55;
    if (win) await pointsService.addMessagePoints(ctx.channelId, userId, ctx.user, 2);

    const cost = free ? 0 : 1;
    const payout = win ? 2 : 0;
    const profit = payout - cost;
    const side = Math.random() < 0.5 ? "Kopf" : "Zahl";
    const freeLeft = await getFreeCount(ctx.channelId, userId, "flip");
    const freeTag = free ? ` [GRATIS · ${freeLeft} übrig]` : "";

    sayInChannel(ctx.channel, `🪙 ${ctx.user} wirft... ${side}! ${win ? "Gewonnen!" : "Verloren!"} ${profit >= 0 ? "+" : ""}${profit} Punkt${freeTag}`);
    ctx.handled = true;
    return;
  }
});
