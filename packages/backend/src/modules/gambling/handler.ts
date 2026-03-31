import { registerHandler } from "../../twitch/message-handler.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { pointsService } from "../points/service.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import type { MessageContext } from "../../twitch/message-handler.js";

// ── Slot Machine ──
// Cost: 25 points | Expected value: ~32 points (net positive ~28%)

const SLOT_COST = 25;
const SLOT_COOLDOWN = 10; // seconds

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
const SLOT_WEIGHTS = [25, 22, 20, 15, 10, 6, 2]; // Lower = rarer

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
    // Triple match
    switch (a) {
      case "7️⃣": return { payout: 777, label: "🎰 JACKPOT 777!!!" };
      case "💎": return { payout: 300, label: "💎 DIAMANT TRIPLE!" };
      case "⭐": return { payout: 150, label: "⭐ STERN TRIPLE!" };
      case "🍇": return { payout: 75, label: "🍇 TRIPLE!" };
      case "🍊": return { payout: 60, label: "🍊 TRIPLE!" };
      case "🍋": return { payout: 50, label: "🍋 TRIPLE!" };
      case "🍒": return { payout: 40, label: "🍒 TRIPLE!" };
      default: return { payout: 50, label: "TRIPLE!" };
    }
  }
  if (a === b || b === c || a === c) {
    return { payout: 30, label: "Doppelt!" };
  }
  // Consolation prize (makes it net positive)
  return { payout: 10, label: "Trostpreis" };
}

// ── Scratch Card (Rubbellos) ──
// Cost: 50 points | Expected value: ~62 points (net positive ~24%)

const SCRATCH_COST = 50;
const SCRATCH_COOLDOWN = 15; // seconds

const SCRATCH_SYMBOLS = ["🍀", "💰", "🎁", "👑", "💎", "🌟"];
const SCRATCH_WEIGHTS = [30, 25, 20, 12, 8, 5];

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

  // All 3 match
  for (const [sym, count] of counts) {
    if (count === 3) {
      switch (sym) {
        case "🌟": return { payout: 1000, label: "🌟🌟🌟 MEGA GEWINN!!!" };
        case "💎": return { payout: 500, label: "💎💎💎 DIAMANT GEWINN!" };
        case "👑": return { payout: 250, label: "👑👑👑 KÖNIGLICH!" };
        case "🎁": return { payout: 150, label: "🎁🎁🎁 GESCHENK!" };
        case "💰": return { payout: 100, label: "💰💰💰 GELDREGEN!" };
        case "🍀": return { payout: 75, label: "🍀🍀🍀 GLÜCKSKLEE!" };
        default: return { payout: 75, label: "DREIER!" };
      }
    }
  }

  // 2 match
  for (const [, count] of counts) {
    if (count === 2) {
      return { payout: 35, label: "Zweier!" };
    }
  }

  // No match — consolation
  return { payout: 15, label: "Trostpreis" };
}

// ── Register Handler (Priority 41 = before autoresponse) ──

registerHandler("gambling", 41, async (ctx: MessageContext) => {
  if (!ctx.channelId) return;

  const channel = await prisma.channel.findUnique({ where: { id: ctx.channelId } });
  if (!channel) return;

  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(prefix)) return;

  const cmd = ctx.message.slice(prefix.length).trim().split(/\s+/)[0]!.toLowerCase();
  const userId = ctx.msg.userInfo.userId;

  // ── !slots ──
  if (cmd === "slots" || cmd === "slot") {
    // Cooldown
    const cdKey = `cd:${ctx.channelId}:slots:${userId}`;
    const cdSet = await redis.set(cdKey, "1", "EX", SLOT_COOLDOWN, "NX");
    if (!cdSet) { sayInChannel(ctx.channel, `@${ctx.user} Slots auf Cooldown!`); ctx.handled = true; return; }

    // Check points
    const user = await pointsService.getUserPoints(ctx.channelId, userId);
    if (!user || user.points < SLOT_COST) {
      await redis.del(cdKey);
      sayInChannel(ctx.channel, `@${ctx.user} Nicht genug Punkte! Brauchst ${SLOT_COST}, hast ${user?.points ?? 0}.`);
      ctx.handled = true;
      return;
    }

    // Deduct cost
    await pointsService.deductPoints(ctx.channelId, userId, SLOT_COST);

    // Spin
    const r1 = spinReel(), r2 = spinReel(), r3 = spinReel();
    const { payout, label } = getSlotPayout(r1, r2, r3);

    // Award payout
    if (payout > 0) {
      await pointsService.addMessagePoints(ctx.channelId, userId, ctx.user, payout);
    }

    const profit = payout - SLOT_COST;
    const profitStr = profit >= 0 ? `+${profit}` : `${profit}`;

    sayInChannel(ctx.channel, `🎰 ${ctx.user} ▸ [ ${r1} | ${r2} | ${r3} ] ▸ ${label} → ${payout} Punkte (${profitStr})`);
    ctx.handled = true;
    return;
  }

  // ── !rubbellos ──
  if (cmd === "rubbellos" || cmd === "scratch" || cmd === "rubbel") {
    // Cooldown
    const cdKey = `cd:${ctx.channelId}:scratch:${userId}`;
    const cdSet = await redis.set(cdKey, "1", "EX", SCRATCH_COOLDOWN, "NX");
    if (!cdSet) { sayInChannel(ctx.channel, `@${ctx.user} Rubbellos auf Cooldown!`); ctx.handled = true; return; }

    // Check points
    const user = await pointsService.getUserPoints(ctx.channelId, userId);
    if (!user || user.points < SCRATCH_COST) {
      await redis.del(cdKey);
      sayInChannel(ctx.channel, `@${ctx.user} Nicht genug Punkte! Brauchst ${SCRATCH_COST}, hast ${user?.points ?? 0}.`);
      ctx.handled = true;
      return;
    }

    // Deduct cost
    await pointsService.deductPoints(ctx.channelId, userId, SCRATCH_COST);

    // Pick 3 symbols
    const s1 = pickScratchSymbol(), s2 = pickScratchSymbol(), s3 = pickScratchSymbol();
    const { payout, label } = getScratchPayout([s1, s2, s3]);

    // Award payout
    if (payout > 0) {
      await pointsService.addMessagePoints(ctx.channelId, userId, ctx.user, payout);
    }

    const profit = payout - SCRATCH_COST;
    const profitStr = profit >= 0 ? `+${profit}` : `${profit}`;

    sayInChannel(ctx.channel, `🎟️ ${ctx.user} kratzt... ${s1} ${s2} ${s3} ▸ ${label} → ${payout} Punkte (${profitStr})`);
    ctx.handled = true;
    return;
  }
});
