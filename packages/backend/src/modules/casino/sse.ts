import type { ServerResponse } from "node:http";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

// ── SSE Client Management ──

interface SSEClient {
  id: string;
  channelId: string;
  userId: string;
  res: ServerResponse;
}

const clients = new Map<string, SSEClient[]>();

export function addClient(channelId: string, client: SSEClient): void {
  const list = clients.get(channelId) ?? [];
  list.push(client);
  clients.set(channelId, list);
  logger.debug({ channelId, clientId: client.id }, "SSE client connected");
}

export function removeClient(channelId: string, clientId: string): void {
  const list = clients.get(channelId);
  if (!list) return;
  const filtered = list.filter((c) => c.id !== clientId);
  if (filtered.length === 0) clients.delete(channelId);
  else clients.set(channelId, filtered);
  logger.debug({ channelId, clientId }, "SSE client disconnected");
}

function sendSSE(res: ServerResponse, event: string, data: unknown): void {
  try {
    if (res.destroyed || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // client gone
  }
}

/** Broadcast an event to ALL clients on a channel */
export function broadcast(channelId: string, event: string, data: unknown): void {
  const list = clients.get(channelId);
  if (!list?.length) return;
  for (const client of list) {
    sendSSE(client.res, event, data);
  }
}

/** Broadcast an event to a SPECIFIC user on a channel */
export function broadcastToUser(channelId: string, userId: string, event: string, data: unknown): void {
  const list = clients.get(channelId);
  if (!list?.length) return;
  for (const client of list) {
    if (client.userId === userId) {
      sendSSE(client.res, event, data);
    }
  }
}

// ── Data Fetchers (mirror the GET endpoints) ──

async function getFeed(channelId: string): Promise<unknown[]> {
  const raw = await redis.lrange(`casino:feed:${channelId}`, 0, 19);
  return raw.map((r: string) => JSON.parse(r));
}

async function getLeaderboard(channelId: string): Promise<unknown[]> {
  return prisma.channelUser.findMany({
    where: { channelId },
    orderBy: { points: "desc" },
    take: 15,
    select: { displayName: true, points: true },
  });
}

async function getFreePlays(channelId: string, userId: string): Promise<{ flip: number; slots: number; scratch: number }> {
  const get = async (g: string) => {
    const c = await redis.get(`free:${g}:${channelId}:${userId}`);
    return Math.max(0, 10 - (c ? parseInt(c) : 0));
  };
  return { flip: await get("flip"), slots: await get("slots"), scratch: await get("scratch") };
}

async function getTickets(channelId: string, userId: string): Promise<unknown> {
  const bingoRaw = await redis.hget(`bingo:tickets:${channelId}`, userId);
  const lottoRaw = await redis.hget(`lotto:tickets:${channelId}`, userId);
  const lastBingo = await redis.get(`bingo:lastdraw:${channelId}`);
  const lastLotto = await redis.get(`lotto:lastdraw:${channelId}`);
  return {
    bingo: bingoRaw ? JSON.parse(bingoRaw) : null,
    lotto: lottoRaw ? JSON.parse(lottoRaw) : null,
    lastBingoDraw: lastBingo ? JSON.parse(lastBingo) : null,
    lastLottoDraw: lastLotto ? JSON.parse(lastLotto) : null,
  };
}

async function getUserPoints(channelId: string, userId: string): Promise<number> {
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    select: { points: true },
  });
  return cu?.points ?? 0;
}

/**
 * Fetch ALL initial state for the casino page — single SSE init payload.
 */
export async function getInitialState(channelId: string, userId: string): Promise<Record<string, unknown>> {
  const { getBossStatus } = await import("../gambling/specials.js");
  const { getActiveHeist } = await import("./heists.js");
  const { getAutoFlipStatus } = await import("./autoflip.js");
  const { getPet, getCareState, getMoodMultiplier } = await import("./pets.js");
  const { getSkillSummary } = await import("./skilltree.js");
  const { getStats } = await import("./stats.js");
  const { getDailyQuests } = await import("./quests.js");
  const { getPlayerAchievements, ACHIEVEMENTS } = await import("./achievements.js");
  const { getSeasonProgress, getSeasonLeaderboard } = await import("./battlepass.js");
  const { getTournamentInfo, getTournamentLeaderboard } = await import("./tournaments.js");
  const { listGuilds, getPlayerGuild } = await import("./guilds.js");
  const { getFullBonusSummary } = await import("./bonus-summary.js");
  const { getLoginData } = await import("./login-streak.js");
  const { getOpenBattle, getBattleHistory } = await import("./pet-battles.js");
  const { getBreedInfo } = await import("./pet-breeding.js");

  const [
    feed, leaderboard, boss, heist, freePlays, tickets, autoflip,
    petData, skills, stats, quests, achievementsData, seasonData,
    seasonLb, tournament, tournamentLb, guilds, myGuild, bonuses,
    loginStreak, battleData, breed, points,
  ] = await Promise.all([
    getFeed(channelId).catch(() => []),
    getLeaderboard(channelId).catch(() => []),
    getBossStatus(channelId).catch(() => null),
    getActiveHeist(channelId).catch(() => null),
    getFreePlays(channelId, userId).catch(() => ({ flip: 0, slots: 0, scratch: 0 })),
    getTickets(channelId, userId).catch(() => null),
    getAutoFlipStatus(channelId, userId).catch(() => null),
    (async () => {
      const pet = await getPet(channelId, userId);
      if (pet) {
        const care = await getCareState(channelId, userId);
        if (care) (pet as any).careState = care;
        if (pet.care) (pet as any).mood = Math.round(getMoodMultiplier(pet.care) * 100);
      }
      return pet;
    })().catch(() => null),
    getSkillSummary(channelId, userId).catch(() => null),
    getStats(channelId, userId).catch(() => null),
    getDailyQuests(channelId, userId).catch(() => []),
    (async () => {
      const { unlocked, total } = await getPlayerAchievements(channelId, userId);
      const unlockedSet = new Set(unlocked);
      const all = ACHIEVEMENTS.map((a) => ({
        id: a.id, name: a.name, description: a.description,
        category: a.category, rarity: a.rarity, reward: a.reward,
        unlocked: unlockedSet.has(a.id),
      }));
      return { achievements: all, unlocked: unlocked.length, total };
    })().catch(() => ({ achievements: [], unlocked: 0, total: 0 })),
    getSeasonProgress(channelId, userId).catch(() => null),
    getSeasonLeaderboard(channelId).catch(() => []),
    getTournamentInfo(channelId).catch(() => null),
    getTournamentLeaderboard(channelId).catch(() => []),
    listGuilds(channelId).catch(() => []),
    getPlayerGuild(channelId, userId).catch(() => null),
    getFullBonusSummary(channelId, userId).catch(() => null),
    getLoginData(channelId, userId).catch(() => null),
    (async () => {
      const [battle, history] = await Promise.all([
        getOpenBattle(channelId),
        getBattleHistory(channelId),
      ]);
      return { battle, history };
    })().catch(() => ({ battle: null, history: [] })),
    getBreedInfo(channelId, userId).catch(() => null),
    getUserPoints(channelId, userId).catch(() => 0),
  ]);

  return {
    feed, leaderboard, boss, heist, freePlays, tickets, autoflip,
    pet: petData, skills, stats, quests, achievements: achievementsData,
    season: seasonData, seasonLb, tournament, tournamentLb, guilds,
    myGuild, bonuses, loginStreak, battle: battleData, breed, points,
  };
}

// ── Broadcast Helpers (called after actions) ──

/**
 * Broadcast common casino updates after a game action.
 * Only fetches+broadcasts the events listed in `what`.
 */
export async function broadcastCasinoUpdate(
  channelId: string,
  userId: string,
  what: {
    feed?: boolean;
    leaderboard?: boolean;
    points?: boolean;
    boss?: boolean;
    heist?: boolean;
    season?: boolean;
    quest?: boolean;
    achievement?: boolean;
    autoflip?: boolean;
    pet?: boolean;
    battle?: boolean;
    tournament?: boolean;
  },
): Promise<void> {
  try {
    const promises: Promise<void>[] = [];

    if (what.feed) {
      promises.push(
        getFeed(channelId).then((data) => broadcast(channelId, "feed", data)).catch(() => {}),
      );
    }

    if (what.leaderboard) {
      promises.push(
        getLeaderboard(channelId).then((data) => broadcast(channelId, "leaderboard", data)).catch(() => {}),
      );
    }

    if (what.points) {
      promises.push(
        getUserPoints(channelId, userId).then((pts) => broadcastToUser(channelId, userId, "points", { points: pts })).catch(() => {}),
      );
    }

    if (what.boss) {
      promises.push(
        (async () => {
          const { getBossStatus } = await import("../gambling/specials.js");
          broadcast(channelId, "boss", await getBossStatus(channelId));
        })().catch(() => {}),
      );
    }

    if (what.heist) {
      promises.push(
        (async () => {
          const { getActiveHeist } = await import("./heists.js");
          broadcast(channelId, "heist", await getActiveHeist(channelId));
        })().catch(() => {}),
      );
    }

    if (what.season) {
      promises.push(
        (async () => {
          const { getSeasonProgress } = await import("./battlepass.js");
          const data = await getSeasonProgress(channelId, userId);
          broadcastToUser(channelId, userId, "season", data);
        })().catch(() => {}),
      );
    }

    if (what.tournament) {
      promises.push(
        (async () => {
          const { getTournamentLeaderboard } = await import("./tournaments.js");
          broadcast(channelId, "tournament", await getTournamentLeaderboard(channelId));
        })().catch(() => {}),
      );
    }

    if (what.battle) {
      promises.push(
        (async () => {
          const { getOpenBattle, getBattleHistory } = await import("./pet-battles.js");
          const [battle, history] = await Promise.all([getOpenBattle(channelId), getBattleHistory(channelId)]);
          broadcast(channelId, "battle", { battle, history });
        })().catch(() => {}),
      );
    }

    await Promise.all(promises);
  } catch (err) {
    logger.error({ err }, "SSE broadcastCasinoUpdate error");
  }
}
