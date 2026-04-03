import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

const LUCKY_HOUR_KEY = (channelId: string) => `casino:luckyhour:${channelId}`;
const LUCKY_HOUR_CHECK_KEY = (channelId: string) =>
  `casino:luckyhour:check:${channelId}`;

const START_CHANCE = 0.05; // 5% chance per hour
const CHECK_COOLDOWN = 3600; // 1 hour between checks
const MIN_DURATION = 10 * 60; // 10 minutes in seconds
const MAX_DURATION = 30 * 60; // 30 minutes in seconds

const LUCKY_HOURS = [
  { type: "double_points", label: "DOPPELTE PUNKTE!", emoji: "💰", multiplier: 2 },
  { type: "free_plays", label: "ALLES GRATIS!", emoji: "🆓", multiplier: 1 },
  { type: "triple_xp", label: "TRIPLE XP!", emoji: "⚡", multiplier: 3 },
  { type: "mega_luck", label: "MEGA GLÜCK!", emoji: "🍀", multiplier: 1.5 },
];

export async function getLuckyHour(
  channelId: string
): Promise<{
  active: boolean;
  type?: string;
  label?: string;
  emoji?: string;
  multiplier?: number;
  endsAt?: number;
} | null> {
  const data = await redis.get(LUCKY_HOUR_KEY(channelId));
  if (!data) return { active: false };

  const parsed = JSON.parse(data);
  return {
    active: true,
    type: parsed.type,
    label: parsed.label,
    emoji: parsed.emoji,
    multiplier: parsed.multiplier,
    endsAt: parsed.endsAt,
  };
}

export async function checkAndStartLuckyHour(
  channelId: string
): Promise<{ started: boolean; luckyHour?: any }> {
  // Check if one is already active
  const existing = await redis.get(LUCKY_HOUR_KEY(channelId));
  if (existing) return { started: false };

  // Internal cooldown: only check once per hour using SET NX EX
  const checkKey = LUCKY_HOUR_CHECK_KEY(channelId);
  const canCheck = await redis.set(checkKey, "1", "EX", CHECK_COOLDOWN, "NX");
  if (!canCheck) return { started: false };

  // Roll for lucky hour
  const roll = Math.random();
  if (roll >= START_CHANCE) return { started: false };

  // Pick a random lucky hour type
  const luckyHour = LUCKY_HOURS[Math.floor(Math.random() * LUCKY_HOURS.length)];

  // Random duration between 10-30 minutes
  const durationSec =
    MIN_DURATION + Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1));
  const endsAt = Date.now() + durationSec * 1000;

  const data = {
    type: luckyHour.type,
    label: luckyHour.label,
    emoji: luckyHour.emoji,
    multiplier: luckyHour.multiplier,
    endsAt,
  };

  await redis.set(LUCKY_HOUR_KEY(channelId), JSON.stringify(data), "EX", durationSec);

  return { started: true, luckyHour: data };
}
