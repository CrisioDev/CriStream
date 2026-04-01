import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

export interface HeistPlayer {
  userId: string;
  displayName: string;
  joined: number;
}

export interface HeistRound {
  userId: string;
  game: string;
  payout: number;
}

export interface Heist {
  id: string;
  channelId: string;
  creatorId: string;
  creatorName: string;
  players: HeistPlayer[];
  status: "lobby" | "playing" | "betrayal" | "finished";
  pot: number;
  rounds: HeistRound[];
  betrayals: string[];
  createdAt: number;
  betrayalStartedAt?: number;
}

const HEIST_COST_CREATOR = 50;
const HEIST_COST_JOIN = 25;
const HEIST_TTL = 600; // 10 minutes
const MAX_PLAYERS = 5;
const ROUNDS_PER_PLAYER = 3;

function heistKey(channelId: string): string {
  return `casino:heist:${channelId}`;
}

async function getHeist(channelId: string): Promise<Heist | null> {
  const raw = await redis.get(heistKey(channelId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Heist;
  } catch {
    return null;
  }
}

async function saveHeist(heist: Heist): Promise<void> {
  const ttl = await redis.ttl(heistKey(heist.channelId));
  await redis.set(heistKey(heist.channelId), JSON.stringify(heist), "EX", ttl > 0 ? ttl : HEIST_TTL);
}

export async function createHeist(
  channelId: string,
  userId: string,
  displayName: string,
): Promise<Heist | { error: string }> {
  const existing = await getHeist(channelId);
  if (existing && existing.status !== "finished") {
    return { error: "Es gibt bereits einen aktiven Heist!" };
  }

  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < HEIST_COST_CREATOR) {
    return { error: `Brauchst ${HEIST_COST_CREATOR} Punkte um einen Heist zu starten!` };
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: HEIST_COST_CREATOR } },
  });

  const heist: Heist = {
    id: `heist_${Date.now()}`,
    channelId,
    creatorId: userId,
    creatorName: displayName,
    players: [{ userId, displayName, joined: Date.now() }],
    status: "lobby",
    pot: HEIST_COST_CREATOR,
    rounds: [],
    betrayals: [],
    createdAt: Date.now(),
  };

  await redis.set(heistKey(channelId), JSON.stringify(heist), "EX", HEIST_TTL);
  return heist;
}

export async function joinHeist(
  channelId: string,
  heistId: string,
  userId: string,
  displayName: string,
): Promise<Heist | { error: string }> {
  const heist = await getHeist(channelId);
  if (!heist || heist.id !== heistId) return { error: "Kein aktiver Heist gefunden!" };
  if (heist.status !== "lobby") return { error: "Heist hat bereits begonnen!" };
  if (heist.players.length >= MAX_PLAYERS) return { error: "Heist ist voll!" };
  if (heist.players.some((p) => p.userId === userId)) return { error: "Du bist bereits dabei!" };

  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < HEIST_COST_JOIN) {
    return { error: `Brauchst ${HEIST_COST_JOIN} Punkte um beizutreten!` };
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: HEIST_COST_JOIN } },
  });

  heist.players.push({ userId, displayName, joined: Date.now() });
  heist.pot += HEIST_COST_JOIN;

  // Auto-start if full
  if (heist.players.length >= MAX_PLAYERS) {
    heist.status = "playing";
  }

  await saveHeist(heist);
  return heist;
}

export async function getActiveHeist(channelId: string): Promise<Heist | null> {
  const heist = await getHeist(channelId);
  if (!heist) return null;
  // Show finished heists for 30s so players can see results
  if (heist.status === "finished") return heist;

  let changed = false;

  // Auto-transition from lobby to playing after 2 minutes
  if (heist.status === "lobby" && Date.now() - heist.createdAt > 120000) {
    if (heist.players.length < 2) {
      // Not enough players — solo heist: just play solo
      // Don't cancel, let the single player play
    }
    heist.status = "playing";
    changed = true;
  }

  // Auto-transition from playing to betrayal if all rounds done
  if (heist.status === "playing") {
    const allDone = heist.players.every(
      (p) => heist.rounds.filter((r) => r.userId === p.userId).length >= ROUNDS_PER_PLAYER,
    );
    if (allDone) {
      heist.status = "betrayal";
      heist.betrayalStartedAt = Date.now();
      changed = true;
    }
  }

  // Auto-finish betrayal after 30 seconds
  if (heist.status === "betrayal" && heist.betrayalStartedAt) {
    if (Date.now() - heist.betrayalStartedAt > 30000) {
      const result = await finishHeist(channelId, heist.id);
      if ("heist" in result) return result.heist;
    }
  }

  if (changed) await saveHeist(heist);
  return heist;
}

// Simplified game logic for heist rounds
function playMiniGame(game: string): number {
  switch (game) {
    case "flip":
      return Math.random() < 0.5 ? 2 : 0;
    case "slots": {
      const roll = Math.random();
      if (roll < 0.04) return 100; // triple
      if (roll < 0.20) return 22;  // double
      return 8;                     // consolation
    }
    case "scratch": {
      const roll = Math.random();
      if (roll < 0.03) return 150; // triple
      if (roll < 0.18) return 30;  // double
      return 15;                    // consolation
    }
    default:
      return Math.random() < 0.5 ? 10 : 0;
  }
}

export async function playHeistRound(
  channelId: string,
  heistId: string,
  userId: string,
  game: string,
): Promise<{ payout: number; heist: Heist } | { error: string }> {
  const heist = await getHeist(channelId);
  if (!heist || heist.id !== heistId) return { error: "Kein aktiver Heist gefunden!" };
  if (heist.status !== "playing") return { error: "Heist ist nicht in der Spielphase!" };
  if (!heist.players.some((p) => p.userId === userId)) return { error: "Du bist nicht im Heist!" };

  // Check if player already played all rounds
  const playerRounds = heist.rounds.filter((r) => r.userId === userId);
  if (playerRounds.length >= ROUNDS_PER_PLAYER) {
    return { error: "Du hast bereits alle Runden gespielt!" };
  }

  const payout = playMiniGame(game);
  heist.rounds.push({ userId, game, payout });
  heist.pot += payout;

  // Check if all players have played all rounds
  const allDone = heist.players.every(
    (p) => heist.rounds.filter((r) => r.userId === p.userId).length >= ROUNDS_PER_PLAYER,
  );

  if (allDone) {
    heist.status = "betrayal";
    heist.betrayalStartedAt = Date.now();
  }

  await saveHeist(heist);
  return { payout, heist };
}

export async function chooseBetray(
  channelId: string,
  heistId: string,
  userId: string,
): Promise<{ heist: Heist } | { error: string }> {
  const heist = await getHeist(channelId);
  if (!heist || heist.id !== heistId) return { error: "Kein aktiver Heist gefunden!" };
  if (heist.status !== "betrayal") return { error: "Nicht in der Verratsphase!" };
  if (!heist.players.some((p) => p.userId === userId)) return { error: "Du bist nicht im Heist!" };
  if (heist.betrayals.includes(userId)) return { error: "Du hast bereits verraten!" };

  heist.betrayals.push(userId);
  await saveHeist(heist);
  return { heist };
}

export async function finishHeist(
  channelId: string,
  heistId: string,
): Promise<{ results: any[]; heist: Heist } | { error: string }> {
  const heist = await getHeist(channelId);
  if (!heist || heist.id !== heistId) return { error: "Kein aktiver Heist gefunden!" };
  if (heist.status !== "betrayal" && heist.status !== "playing") {
    return { error: "Heist kann nicht beendet werden!" };
  }

  heist.status = "finished";
  const results: any[] = [];
  (heist as any).finishedResults = []; // store results on heist for frontend
  const pot = heist.pot;
  const numPlayers = heist.players.length;
  const numBetrayers = heist.betrayals.length;
  const loyalPlayers = heist.players.filter((p) => !heist.betrayals.includes(p.userId));

  if (numBetrayers === 0) {
    // No betrayal: pot * 1.5 / numPlayers
    const share = Math.floor((pot * 1.5) / numPlayers);
    for (const p of heist.players) {
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId, twitchUserId: p.userId } },
        data: { points: { increment: share } },
      });
      results.push({ userId: p.userId, displayName: p.displayName, payout: share, betrayed: false });
    }
  } else if (numBetrayers === numPlayers) {
    // Everyone betrays: everyone loses
    for (const p of heist.players) {
      results.push({ userId: p.userId, displayName: p.displayName, payout: 0, betrayed: true });
    }
  } else if (numBetrayers === 1) {
    // 1 betrayer: gets 80%, others split 20%
    const betrayerId = heist.betrayals[0]!;
    const betrayerPayout = Math.floor(pot * 0.8);
    const loyalShare = Math.floor((pot * 0.2) / loyalPlayers.length);

    for (const p of heist.players) {
      if (p.userId === betrayerId) {
        await prisma.channelUser.update({
          where: { channelId_twitchUserId: { channelId, twitchUserId: p.userId } },
          data: { points: { increment: betrayerPayout } },
        });
        results.push({ userId: p.userId, displayName: p.displayName, payout: betrayerPayout, betrayed: true });
      } else {
        await prisma.channelUser.update({
          where: { channelId_twitchUserId: { channelId, twitchUserId: p.userId } },
          data: { points: { increment: loyalShare } },
        });
        results.push({ userId: p.userId, displayName: p.displayName, payout: loyalShare, betrayed: false });
      }
    }
  } else {
    // Multiple betrayers: betrayers lose, loyal split full pot
    const loyalShare = loyalPlayers.length > 0 ? Math.floor(pot / loyalPlayers.length) : 0;

    for (const p of heist.players) {
      if (heist.betrayals.includes(p.userId)) {
        results.push({ userId: p.userId, displayName: p.displayName, payout: 0, betrayed: true });
      } else {
        await prisma.channelUser.update({
          where: { channelId_twitchUserId: { channelId, twitchUserId: p.userId } },
          data: { points: { increment: loyalShare } },
        });
        results.push({ userId: p.userId, displayName: p.displayName, payout: loyalShare, betrayed: false });
      }
    }
  }

  (heist as any).finishedResults = results;
  await saveHeist(heist);

  // Log to feed
  const feedEntry = JSON.stringify({
    user: "CASINO",
    game: "heist",
    payout: pot,
    profit: 0,
    detail: `🏦 Heist beendet! Pot: ${pot} | Verräter: ${numBetrayers}/${numPlayers}`,
    time: Date.now(),
  });
  await redis.lpush(`casino:feed:${channelId}`, feedEntry);
  await redis.ltrim(`casino:feed:${channelId}`, 0, 29);

  return { results, heist };
}
