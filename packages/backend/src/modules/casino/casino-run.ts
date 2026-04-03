import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CasinoRun {
  stage: number;          // current stage (0-based, endless)
  currentGame: string;    // the game to play now
  results: boolean[];     // win/loss per completed stage
  startedAt: number;
  points: number;         // initial cost
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
const RUN_COST = 50;
const RUN_TTL = 3600; // 1 hour

/** Multiplier for each stage — escalates endlessly */
function getMultiplier(stage: number): number {
  // 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 15, 20, ...
  if (stage <= 2) return 1 + stage * 0.1;
  if (stage <= 5) return 1 + (stage - 2) * 0.5;
  if (stage <= 8) return 3 + (stage - 5);
  if (stage <= 12) return 6 + (stage - 8) * 2.5;
  return 16 + (stage - 12) * 5; // beyond stage 12: gets crazy
}

/** Pick the next game — avoids repeating the last game */
function pickNextGame(lastGame?: string): string {
  const pool = lastGame ? GAME_POOL.filter(g => g !== lastGame) : GAME_POOL;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

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
    currentGame: pickNextGame(),
    results: [],
    startedAt: Date.now(),
    points: RUN_COST,
  };

  await redis.set(runKey(channelId, userId), JSON.stringify(run), "EX", RUN_TTL);

  return run;
}

/**
 * Reports the result of the current stage.
 * Endless mode: won → advance, lost → game over + save score to leaderboard.
 * Score = sum of multipliers for all won stages.
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
  run.results.push(won);

  // Calculate score = 100 × sum of all multipliers earned
  const calcScore = () => {
    let total = 0;
    for (let i = 0; i < run.results.length; i++) {
      if (run.results[i]) total += getMultiplier(i);
    }
    return Math.round(100 * Math.max(1, total));
  };

  if (!won) {
    // Game over — save score to leaderboard
    await redis.del(runKey(channelId, userId));
    const score = calcScore();
    const stagesWon = run.results.filter(Boolean).length;

    if (stagesWon > 0) {
      // Only save if they won at least 1 stage
      const existingScore = await redis.zscore(lbKey(channelId), userId);
      // Keep their best score
      if (!existingScore || score > parseInt(existingScore)) {
        await redis.zadd(lbKey(channelId), score, userId);
        await redis.hset(lbDataKey(channelId), userId, JSON.stringify({
          displayName,
          stagesWon,
          timestamp: Date.now(),
        }));
      }
    }

    const rank = await redis.zrevrank(lbKey(channelId), userId);
    return { status: "gameover", run, score, leaderboardRank: rank !== null ? rank + 1 : undefined };
  }

  // Won — advance to next stage
  run.stage += 1;
  run.currentGame = pickNextGame(run.currentGame);
  await redis.set(runKey(channelId, userId), JSON.stringify(run), "EX", RUN_TTL);

  return { status: "continue", run, score: calcScore() };
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
