import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

export interface CasinoSpecial {
  type:
    | "mitleid" | "ragequit" | "beinahe_jackpot" | "verfluchte_muenze" | "schwarze_katze"
    | "goldener_regen" | "multiplikator" | "jackpot_sirene" | "geschenk_an_chat"
    | "mystery_box" | "boss_damage" | "boss_kill";
  points?: number;
  message: string;
  animationData?: Record<string, any>;
}

interface PrePlayCtx {
  channelId: string;
  userId: string;
  displayName: string;
  game: "flip" | "slots" | "scratch" | "double";
}

interface PostPlayCtx extends PrePlayCtx {
  win: boolean;
  payout: number;
  cost: number;
  reels?: string[];
  isTriple?: boolean;
  is777?: boolean;
}

/** Called BEFORE the dice roll — can force wins or override win chances */
export async function prePlaySpecials(ctx: PrePlayCtx): Promise<{
  specials: CasinoSpecial[];
  forceWin?: boolean;
  winChanceOverride?: number;
}> {
  const specials: CasinoSpecial[] = [];
  const { channelId: cid, userId: uid, game } = ctx;

  // Rage Quit Bonus: eligible flag + last play > 60s ago
  const eligible = await redis.get(`casino:ragequit:eligible:${cid}:${uid}`);
  if (eligible) {
    const lastPlay = await redis.get(`casino:ragequit:${cid}:${uid}`);
    if (lastPlay && (Date.now() - parseInt(lastPlay)) > 60000) {
      await redis.del(`casino:ragequit:eligible:${cid}:${uid}`);
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId: cid, twitchUserId: uid } },
        data: { points: { increment: 25 } },
      });
      specials.push({ type: "ragequit", points: 25, message: "🎁 Willkommen zurück! +25 Trostpunkte!" });
    }
  }

  // Schwarze Katze active → force win
  const katze = await redis.getdel(`casino:katze:${cid}:${uid}`);
  if (katze) {
    return { specials, forceWin: true };
  }

  // Verfluchte Münze active → 75% flip win
  if (game === "flip") {
    const cursed = await redis.getdel(`casino:cursed:${cid}:${uid}`);
    if (cursed) {
      return { specials, winChanceOverride: 0.75 };
    }
  }

  return { specials };
}

/** Called AFTER the dice roll — evaluates all specials */
export async function postPlaySpecials(ctx: PostPlayCtx): Promise<{
  specials: CasinoSpecial[];
  adjustedPayout: number;
}> {
  const specials: CasinoSpecial[] = [];
  let adjustedPayout = ctx.payout;
  const { channelId: cid, userId: uid, displayName, game, win, payout, reels, isTriple, is777 } = ctx;

  // ── Update counters ──
  if (win) {
    await redis.set(`casino:streak:${cid}:${uid}`, "0", "EX", 86400);
    if (game === "flip") await redis.set(`casino:flipstreak:${cid}:${uid}`, "0", "EX", 86400);
  } else {
    await redis.incr(`casino:streak:${cid}:${uid}`);
    await redis.expire(`casino:streak:${cid}:${uid}`, 86400);
    if (game === "flip") {
      await redis.incr(`casino:flipstreak:${cid}:${uid}`);
      await redis.expire(`casino:flipstreak:${cid}:${uid}`, 86400);
    }
  }
  const spinCount = await redis.incr(`casino:spincount:${cid}:${uid}`);
  const totalSpins = await redis.incr(`casino:totalspins:${cid}`);
  await redis.set(`casino:ragequit:${cid}:${uid}`, String(Date.now()), "EX", 86400);

  const streak = parseInt(await redis.get(`casino:streak:${cid}:${uid}`) ?? "0");

  // ── LOSS SPECIALS ──
  if (!win) {
    // Mitleids-Punkte: exactly 3 losses
    if (streak === 3) {
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId: cid, twitchUserId: uid } },
        data: { points: { increment: 5 } },
      });
      specials.push({ type: "mitleid", points: 5, message: "😢 3x Pech! +5 Mitleids-Punkte" });
    }

    // Rage Quit eligible at 5+ losses
    if (streak >= 5) {
      await redis.set(`casino:ragequit:eligible:${cid}:${uid}`, "1", "EX", 86400);
    }

    // Beinahe-Jackpot: 2 of 3 matching (slots/scratch)
    if (reels && reels.length === 3) {
      const [a, b, c] = reels;
      const pairs = (a === b ? 1 : 0) + (b === c ? 1 : 0) + (a === c ? 1 : 0);
      if (pairs === 1) {
        specials.push({ type: "beinahe_jackpot", message: "😱 SO KNAPP! Fast ein Triple!", animationData: { reels } });
      }
    }

    // Verfluchte Münze: 5+ flip losses
    if (game === "flip") {
      const flipStreak = parseInt(await redis.get(`casino:flipstreak:${cid}:${uid}`) ?? "0");
      if (flipStreak >= 5) {
        await redis.set(`casino:cursed:${cid}:${uid}`, "1", "EX", 3600);
        specials.push({ type: "verfluchte_muenze", message: "🔥 Verfluchte Münze! Nächster Flip brennt!" });
      }
    }

    // Schwarze Katze: 3% chance per loss
    if (Math.random() < 0.03) {
      await redis.set(`casino:katze:${cid}:${uid}`, "1", "EX", 300);
      specials.push({ type: "schwarze_katze", message: "🐈‍⬛ Eine schwarze Katze! Nächster Spin = Garantie-Gewinn!" });
    }
  }

  // ── WIN SPECIALS ──
  if (win) {
    // Goldener Regen: triples
    if (isTriple) {
      specials.push({ type: "goldener_regen", message: "🌟 GOLDENER REGEN! Triple!", animationData: { reels } });
    }

    // Multiplikator-Roulette: payout >= 100
    if (payout >= 100) {
      const roll = Math.random();
      let multi: number;
      if (roll < 0.40) multi = 2;
      else if (roll < 0.70) multi = 3;
      else if (roll < 0.90) multi = 4;
      else multi = 5;
      const bonus = payout * (multi - 1);
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId: cid, twitchUserId: uid } },
        data: { points: { increment: bonus } },
      });
      adjustedPayout = payout * multi;
      specials.push({
        type: "multiplikator", points: bonus,
        message: `🎡 MULTIPLIKATOR x${multi}! +${bonus} Bonus!`,
        animationData: { multiplier: multi, bonus },
      });
    }

    // Jackpot-Sirene: 777
    if (is777) {
      specials.push({ type: "jackpot_sirene", message: "🚨 JACKPOT SIRENE! 777!!!", animationData: { flash: true } });
    }

    // Geschenk an Chat: payout >= 500
    if (payout >= 500) {
      try {
        const viewers = await prisma.channelUser.findMany({
          where: { channelId: cid, twitchUserId: { not: uid } },
          select: { twitchUserId: true, displayName: true },
          take: 50,
        });
        const shuffled = viewers.sort(() => Math.random() - 0.5).slice(0, 5);
        if (shuffled.length > 0) {
          await prisma.channelUser.updateMany({
            where: { channelId: cid, twitchUserId: { in: shuffled.map(v => v.twitchUserId) } },
            data: { points: { increment: 10 } },
          });
          const names = shuffled.map(v => v.displayName);
          specials.push({
            type: "geschenk_an_chat", points: 10,
            message: `🎁 ${displayName} schenkt ${names.join(", ")} je 10 Punkte!`,
            animationData: { recipients: names },
          });
        }
      } catch { /* non-critical */ }
    }
  }

  // ── ALWAYS SPECIALS ──

  // Mystery Box: every 20 spins
  if (spinCount > 0 && spinCount % 20 === 0) {
    const reward = Math.floor(Math.random() * 50) + 1;
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId: cid, twitchUserId: uid } },
      data: { points: { increment: reward } },
    });
    specials.push({ type: "mystery_box", points: reward, message: `📦 MYSTERY BOX! +${reward} Punkte!` });
  }

  // Boss Fight
  const bossExists = await redis.exists(`casino:boss:${cid}`);
  if (bossExists && win) {
    const damage = Math.max(1, Math.ceil(payout / 10));
    const newHp = await redis.hincrby(`casino:boss:${cid}`, "hp", -damage);
    await redis.zincrby(`casino:boss:dmg:${cid}`, damage, uid);

    if (newHp <= 0) {
      // Boss defeated — reward all participants
      const participants = await redis.zrange(`casino:boss:dmg:${cid}`, 0, -1);
      if (participants.length > 0) {
        await prisma.channelUser.updateMany({
          where: { channelId: cid, twitchUserId: { in: participants } },
          data: { points: { increment: 50 } },
        });
      }
      const bossName = await redis.hget(`casino:boss:${cid}`, "name") ?? "Boss";
      await redis.del(`casino:boss:${cid}`, `casino:boss:dmg:${cid}`);
      specials.push({
        type: "boss_kill", points: 50,
        message: `💀 ${bossName} BESIEGT! ${participants.length} Spieler erhalten je +50!`,
        animationData: { bossName, participants: participants.length },
      });
    } else {
      const maxHp = parseInt(await redis.hget(`casino:boss:${cid}`, "maxHp") ?? "1000");
      const bossName = await redis.hget(`casino:boss:${cid}`, "name") ?? "Boss";
      specials.push({
        type: "boss_damage",
        message: `⚔️ -${damage} HP an ${bossName}! (${Math.max(0, newHp)}/${maxHp})`,
        animationData: { damage, hp: Math.max(0, newHp), maxHp, bossName },
      });
    }
  }

  // Boss Spawn check: every 100 channel-wide spins, 30% chance
  if (!bossExists && totalSpins > 0 && totalSpins % 100 === 0 && Math.random() < 0.30) {
    const bosses = [
      { name: "🐉 Drache", hp: 1500 },
      { name: "👹 Troll König", hp: 1000 },
      { name: "🤖 Mega Bot", hp: 800 },
      { name: "👻 Geisterfürst", hp: 1200 },
      { name: "🦑 Kraken", hp: 900 },
    ];
    const boss = bosses[Math.floor(Math.random() * bosses.length)]!;
    await redis.hset(`casino:boss:${cid}`, { name: boss.name, hp: String(boss.hp), maxHp: String(boss.hp) });
    await redis.expire(`casino:boss:${cid}`, 86400);
    // Feed log for boss spawn
    const entry = JSON.stringify({
      user: "CASINO", game: "boss", payout: 0, profit: 0,
      detail: `${boss.name} ist erschienen! ${boss.hp} HP — Spielt um Schaden zu machen!`,
      time: Date.now(),
    });
    await redis.lpush(`casino:feed:${cid}`, entry);
    await redis.ltrim(`casino:feed:${cid}`, 0, 29);
  }

  return { specials, adjustedPayout };
}

/** Glucksrad: daily free wheel spin */
export async function spinGluecksrad(channelId: string, userId: string, displayName: string): Promise<
  { success: true; points: number; message: string } | { success: false; error: string }
> {
  const key = `casino:gluecksrad:${channelId}:${userId}`;
  const already = await redis.get(key);
  if (already) return { success: false, error: "Schon gedreht heute! Morgen wieder." };

  // Weighted: lower values more likely
  const roll = Math.random();
  let points: number;
  if (roll < 0.35) points = Math.floor(Math.random() * 10) + 1;        // 1-10 (35%)
  else if (roll < 0.65) points = Math.floor(Math.random() * 20) + 11;   // 11-30 (30%)
  else if (roll < 0.85) points = Math.floor(Math.random() * 30) + 31;   // 31-60 (20%)
  else if (roll < 0.95) points = Math.floor(Math.random() * 20) + 61;   // 61-80 (10%)
  else points = Math.floor(Math.random() * 20) + 81;                     // 81-100 (5%)

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { increment: points } },
  });

  // TTL until midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const ttl = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  await redis.set(key, "1", "EX", ttl);

  // Log to feed
  const entry = JSON.stringify({
    user: displayName, game: "gluecksrad", payout: points, profit: points,
    detail: `🎡 Glücksrad: +${points}`, time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, entry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { success: true, points, message: `🎡 Glücksrad: +${points} Punkte!` };
}

/** Get boss status for a channel */
export async function getBossStatus(channelId: string): Promise<{
  active: boolean;
  name?: string;
  hp?: number;
  maxHp?: number;
  participants?: number;
} | null> {
  const exists = await redis.exists(`casino:boss:${channelId}`);
  if (!exists) return { active: false };
  const data = await redis.hgetall(`casino:boss:${channelId}`);
  const participantCount = await redis.zcard(`casino:boss:dmg:${channelId}`);
  return {
    active: true,
    name: data.name ?? "Boss",
    hp: parseInt(data.hp ?? "0"),
    maxHp: parseInt(data.maxHp ?? "1000"),
    participants: participantCount,
  };
}
