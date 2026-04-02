import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CasinoRun {
  stage: number;          // 0-4 (5 stages total)
  games: string[];        // sequence of 5 random games
  results: boolean[];     // win/loss per completed stage
  multipliers: number[];  // [1, 1.5, 2, 3, 5]
  startedAt: number;
  points: number;         // initial 50
}

export interface RunStageResult {
  status: "continue" | "victory" | "gameover";
  run: CasinoRun;
  score?: number;
  leaderboardRank?: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  games: string[];
  timestamp: number;
  rank: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GAME_POOL = ["flip", "slots", "scratch", "dice21", "poker", "roulette", "memory"];
const STAGE_MULTIPLIERS = [1, 1.5, 2, 3, 5];
const RUN_COST = 50;
const RUN_TTL = 3600; // 1 hour
const NUM_STAGES = 5;

// ── Redis Key Helpers ──────────────────────────────────────────────────────

function runKey(channelId: string, userId: string) {
  return `casino:run:${channelId}:${userId}`;
}

function lbKey(channelId: string) {
  return `casino:run:lb:${channelId}`;
}

function lbDataKey(channelId: string) {
  return `casino:run:lb:data:${channelId}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pickRandomGames(count: number): string[] {
  const shuffled = [...GAME_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Exported Functions ─────────────────────────────────────────────────────

/**
 * Returns the current active run for a user, or null if none exists.
 */
export async function getRunStatus(
  channelId: string,
  userId: string,
): Promise<CasinoRun | null> {
  const raw = await redis.get(runKey(channelId, userId));
  if (!raw) return null;
  return JSON.parse(raw) as CasinoRun;
}

/**
 * Starts a new casino run. Costs 50 points from the user's balance.
 * Returns the new run state or throws if insufficient points / already in a run.
 */
export async function startRun(
  channelId: string,
  userId: string,
  displayName: string,
): Promise<CasinoRun> {
  // Check for existing run
  const existing = await redis.get(runKey(channelId, userId));
  if (existing) {
    throw new Error("Du hast bereits einen aktiven Run! Beende ihn zuerst.");
  }

  // Deduct points
  const cu = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });

  if (!cu || cu.points < RUN_COST) {
    throw new Error(`Du brauchst mindestens ${RUN_COST} Punkte für einen Casino-Run.`);
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: RUN_COST } },
  });

  const run: CasinoRun = {
    stage: 0,
    games: pickRandomGames(NUM_STAGES),
    results: [],
    multipliers: STAGE_MULTIPLIERS,
    startedAt: Date.now(),
    points: RUN_COST,
  };

  await redis.set(runKey(channelId, userId), JSON.stringify(run), "EX", RUN_TTL);

  return run;
}

/**
 * Reports the result of the current stage.
 * - Won + not last stage → advance (continue)
 * - Won + last stage → calculate score, save to leaderboard (victory)
 * - Lost → game over, no score (gameover)
 */
export async function reportRunStage(
  channelId: string,
  userId: string,
  displayName: string,
  won: boolean,
): Promise<RunStageResult> {
  const raw = await redis.get(runKey(channelId, userId));
  if (!raw) {
    throw new Error("Kein aktiver Casino-Run gefunden.");
  }

  const run = JSON.parse(raw) as CasinoRun;

  // Record result
  run.results.push(won);

  if (!won) {
    // Game over — remove run
    await redis.del(runKey(channelId, userId));
    return { status: "gameover", run };
  }

  // Won this stage
  const isLastStage = run.stage >= NUM_STAGES - 1;

  if (!isLastStage) {
    // Advance to next stage
    run.stage += 1;
    await redis.set(runKey(channelId, userId), JSON.stringify(run), "EX", RUN_TTL);
    return { status: "continue", run };
  }

  // Victory — all 5 stages won
  await redis.del(runKey(channelId, userId));

  // Score = 100 × product of all multipliers
  const score = Math.round(
    100 * run.multipliers.reduce((acc, m) => acc * m, 1),
  );

  // Save to leaderboard sorted set
  await redis.zadd(lbKey(channelId), score, userId);

  // Save entry details in hash
  const entryData = JSON.stringify({
    displayName,
    games: run.games,
    timestamp: Date.now(),
  });
  await redis.hset(lbDataKey(channelId), userId, entryData);

  // Determine rank (ZREVRANK is 0-based, top score = rank 0)
  const rank = await redis.zrevrank(lbKey(channelId), userId);
  const leaderboardRank = rank !== null ? rank + 1 : 1;

  return { status: "victory", run, score, leaderboardRank };
}

/**
 * Returns the top scores for the channel leaderboard.
 */
export async function getRunLeaderboard(
  channelId: string,
  limit = 15,
): Promise<LeaderboardEntry[]> {
  // ZREVRANGE returns [member, score, member, score, ...]
  const raw = await redis.zrevrange(lbKey(channelId), 0, limit - 1, "WITHSCORES");

  if (!raw || raw.length === 0) return [];

  const entries: LeaderboardEntry[] = [];
  const userIds: string[] = [];

  // Collect user IDs
  for (let i = 0; i < raw.length; i += 2) {
    userIds.push(raw[i]);
  }

  // Batch-fetch display data from hash
  const dataRaw = userIds.length > 0
    ? await redis.hmget(lbDataKey(channelId), ...userIds)
    : [];

  for (let i = 0; i < raw.length; i += 2) {
    const userId = raw[i];
    const score = parseInt(raw[i + 1], 10);
    const idx = i / 2;
    const detail = dataRaw[idx] ? JSON.parse(dataRaw[idx]!) : {};

    entries.push({
      userId,
      displayName: detail.displayName ?? userId,
      score,
      games: detail.games ?? [],
      timestamp: detail.timestamp ?? 0,
      rank: idx + 1,
    });
  }

  return entries;
}
