import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyChallenge {
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: { points: number; title: string };
  completed: boolean;
  completedAt?: number;
  participants: number;
}

interface ChallengeTemplate {
  type: string;
  title: string;
  desc: string;
  targetRange: [number, number];
  reward: { points: number; title: string };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const TEMPLATES: ChallengeTemplate[] = [
  {
    type: "community_wins",
    title: "Gewinn-Offensive",
    desc: "Sammelt gemeinsam {target} Siege!",
    targetRange: [50, 100],
    reward: { points: 100, title: "Sieger des Tages" },
  },
  {
    type: "community_triples",
    title: "Triple-Jagd",
    desc: "Erreicht zusammen {target} Dreier-Kombos!",
    targetRange: [10, 25],
    reward: { points: 150, title: "Triple-Jäger" },
  },
  {
    type: "community_plays",
    title: "Spielmarathon",
    desc: "Spielt gemeinsam {target} Runden!",
    targetRange: [200, 500],
    reward: { points: 75, title: "Marathon-Spieler" },
  },
  {
    type: "community_points",
    title: "Punkte-Regen",
    desc: "Gewinnt zusammen {target} Punkte!",
    targetRange: [5000, 20000],
    reward: { points: 200, title: "Goldsammler" },
  },
  {
    type: "community_bosses",
    title: "Boss-Bezwinger",
    desc: "Besiegt gemeinsam {target} Bosse!",
    targetRange: [3, 8],
    reward: { points: 250, title: "Boss-Bezwinger" },
  },
];

// Mapping from contribution event types to challenge types
const CONTRIBUTION_MAP: Record<string, string> = {
  win: "community_wins",
  triple: "community_triples",
  play: "community_plays",
  points_won: "community_points",
  boss_kill: "community_bosses",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Today's date string in YYYY-MM-DD (UTC). */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds remaining until next midnight UTC. */
function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

/**
 * Simple deterministic hash from a string, returning a positive integer.
 * Used to seed the daily challenge selection so the same date always
 * produces the same challenge for a given channel.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Pick a deterministic random integer in [min, max] using a seed. */
function seededRange(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
}

function challengeKey(channelId: string, date: string): string {
  return `casino:challenge:${channelId}:${date}`;
}

function participantsKey(channelId: string, date: string): string {
  return `casino:challenge:parts:${channelId}:${date}`;
}

// ---------------------------------------------------------------------------
// Exported Functions
// ---------------------------------------------------------------------------

/**
 * Returns today's daily challenge for the channel.
 * Creates it deterministically if it doesn't exist yet.
 */
export async function getDailyChallenge(
  channelId: string,
): Promise<DailyChallenge> {
  const date = todayUTC();
  const key = challengeKey(channelId, date);

  const existing = await redis.get(key);
  if (existing) {
    const data = JSON.parse(existing);
    const participants = await redis.scard(participantsKey(channelId, date));
    return { ...data, participants } as DailyChallenge;
  }

  // Deterministic selection based on channel + date
  const seed = simpleHash(`${channelId}:${date}`);
  const templateIndex = seed % TEMPLATES.length;
  const template = TEMPLATES[templateIndex];

  const target = seededRange(
    simpleHash(`${channelId}:${date}:target`),
    template.targetRange[0],
    template.targetRange[1],
  );

  const challenge: DailyChallenge = {
    type: template.type,
    title: template.title,
    description: template.desc.replace("{target}", String(target)),
    target,
    progress: 0,
    reward: { ...template.reward },
    completed: false,
    participants: 0,
  };

  const ttl = secondsUntilMidnightUTC();
  await redis.set(key, JSON.stringify(challenge), "EX", ttl);
  await redis.expire(participantsKey(channelId, date), ttl);

  return challenge;
}

/**
 * Contribute progress to today's challenge.
 * Only counts if the event type matches the active challenge.
 */
export async function contributeToDailyChallenge(
  channelId: string,
  userId: string,
  type: string,
  amount: number = 1,
): Promise<{ contributed: boolean; challenge: DailyChallenge }> {
  const challenge = await getDailyChallenge(channelId);

  // Already completed — no more contributions
  if (challenge.completed) {
    return { contributed: false, challenge };
  }

  // Check if event type matches current challenge
  const mappedType = CONTRIBUTION_MAP[type];
  if (!mappedType || mappedType !== challenge.type) {
    return { contributed: false, challenge };
  }

  const date = todayUTC();
  const key = challengeKey(channelId, date);
  const partsKey = participantsKey(channelId, date);

  // Increment progress
  challenge.progress = Math.min(challenge.progress + amount, challenge.target);

  // Add participant
  await redis.sadd(partsKey, userId);
  challenge.participants = await redis.scard(partsKey);

  // Check completion
  if (challenge.progress >= challenge.target) {
    challenge.completed = true;
    challenge.completedAt = Date.now();
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(challenge), "EX", ttl > 0 ? ttl : secondsUntilMidnightUTC());
    // Award rewards
    await completeDailyChallenge(channelId);
  } else {
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(challenge), "EX", ttl > 0 ? ttl : secondsUntilMidnightUTC());
  }

  return { contributed: true, challenge };
}

/**
 * Awards reward points to every participant of today's challenge.
 * Returns the number of participants rewarded.
 */
export async function completeDailyChallenge(
  channelId: string,
): Promise<number> {
  const date = todayUTC();
  const partsKey = participantsKey(channelId, date);

  const participantIds = await redis.smembers(partsKey);
  if (participantIds.length === 0) return 0;

  const key = challengeKey(channelId, date);
  const raw = await redis.get(key);
  if (!raw) return 0;

  const challenge: DailyChallenge = JSON.parse(raw);
  const rewardPoints = challenge.reward.points;

  // Award points to all participants
  await prisma.channelUser.updateMany({
    where: {
      channelId,
      twitchUserId: { in: participantIds },
    },
    data: {
      points: { increment: rewardPoints },
    },
  });

  return participantIds.length;
}
