import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Weekly Tournaments
 *
 * Running Mon-Sun, players earn tournament points by winning casino games.
 * Top 3 at week's end receive prizes.
 */

// Fixed epoch for week calculation (Monday, Jan 1 2024)
const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getCurrentWeekNumber(): number {
  return Math.floor((Date.now() - EPOCH) / WEEK_MS);
}

function getWeekBounds(weekNumber: number): { startDate: string; endDate: string } {
  const startMs = EPOCH + weekNumber * WEEK_MS;
  const endMs = startMs + WEEK_MS - 1;
  return {
    startDate: new Date(startMs).toISOString().slice(0, 10),
    endDate: new Date(endMs).toISOString().slice(0, 10),
  };
}

function scoreKey(channelId: string, weekNumber: number): string {
  return `casino:tournament:${channelId}:week:${weekNumber}`;
}

function activeKey(channelId: string): string {
  return `casino:tournament:${channelId}:active`;
}

function nameKey(channelId: string): string {
  return `casino:tournament:${channelId}:names`;
}

/** Ensure the current week's tournament is active */
async function ensureTournament(channelId: string): Promise<{ weekNumber: number; startDate: string; endDate: string }> {
  const weekNumber = getCurrentWeekNumber();
  const bounds = getWeekBounds(weekNumber);

  const raw = await redis.get(activeKey(channelId));
  if (raw) {
    const active = JSON.parse(raw);
    if (active.weekNumber === weekNumber) return active;
  }

  const info = { weekNumber, ...bounds };
  await redis.set(activeKey(channelId), JSON.stringify(info));
  return info;
}

/** Add tournament points for a player */
export async function addTournamentPoints(channelId: string, userId: string, points: number, displayName?: string): Promise<void> {
  const { weekNumber } = await ensureTournament(channelId);
  await redis.zincrby(scoreKey(channelId, weekNumber), points, userId);
  // Expire score key after 2 weeks
  await redis.expire(scoreKey(channelId, weekNumber), 14 * 86400);

  // Store display name for leaderboard
  if (displayName) {
    await redis.hset(nameKey(channelId), userId, displayName);
    await redis.expire(nameKey(channelId), 14 * 86400);
  }
}

/** Get the tournament leaderboard (top 20) */
export async function getTournamentLeaderboard(channelId: string): Promise<{ displayName: string; score: number; rank: number }[]> {
  const { weekNumber } = await ensureTournament(channelId);
  const raw = await redis.zrevrange(scoreKey(channelId, weekNumber), 0, 19, "WITHSCORES");

  const result: { displayName: string; score: number; rank: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const userId = raw[i]!;
    const score = parseInt(raw[i + 1]!, 10);
    const name = await redis.hget(nameKey(channelId), userId);
    result.push({
      displayName: name ?? userId,
      score,
      rank: Math.floor(i / 2) + 1,
    });
  }

  return result;
}

/** Get current tournament info */
export async function getTournamentInfo(channelId: string): Promise<{
  weekNumber: number; startDate: string; endDate: string; daysLeft: number;
}> {
  const info = await ensureTournament(channelId);
  const endMs = EPOCH + (info.weekNumber + 1) * WEEK_MS;
  const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / 86400000));
  return { ...info, daysLeft };
}

/** Finish the tournament and distribute prizes (called by scheduler or manually) */
export async function finishTournament(channelId: string): Promise<{ winners: any[] }> {
  const { weekNumber } = await ensureTournament(channelId);
  const raw = await redis.zrevrange(scoreKey(channelId, weekNumber), 0, 2, "WITHSCORES");

  const winners: any[] = [];
  const prizes = [
    { points: 1000, title: "🏆 Turnier-Champion" },
    { points: 500, title: null },
    { points: 250, title: null },
  ];

  for (let i = 0; i < raw.length; i += 2) {
    const userId = raw[i]!;
    const score = parseInt(raw[i + 1]!, 10);
    const rank = Math.floor(i / 2);
    const prize = prizes[rank];
    if (!prize) break;

    const name = await redis.hget(nameKey(channelId), userId);

    // Grant prize points
    await prisma.channelUser.updateMany({
      where: { channelId, twitchUserId: userId },
      data: { points: { increment: prize.points } },
    });

    winners.push({
      userId,
      displayName: name ?? userId,
      rank: rank + 1,
      score,
      prize: prize.points,
      title: prize.title,
    });
  }

  return { winners };
}
