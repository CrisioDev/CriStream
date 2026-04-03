import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

const COMBO_KEY = (channelId: string, userId: string) =>
  `casino:combo:${channelId}:${userId}`;

const COMBO_TTL = 300; // 5 minutes
const MAX_MULTIPLIER = 2.0;
const MULTIPLIER_PER_CHAIN = 0.05;

export interface ComboState {
  chain: number;
  maxChain: number;
  multiplier: number;
  lastGame: number;
}

export async function getCombo(
  channelId: string,
  userId: string
): Promise<ComboState | null> {
  const data = await redis.get(COMBO_KEY(channelId, userId));
  if (!data) return null;
  return JSON.parse(data) as ComboState;
}

export async function recordComboResult(
  channelId: string,
  userId: string,
  won: boolean
): Promise<ComboState> {
  const key = COMBO_KEY(channelId, userId);
  const existing = await getCombo(channelId, userId);

  let chain: number;
  let maxChain: number;

  if (won) {
    chain = (existing?.chain ?? 0) + 1;
    maxChain = Math.max(chain, existing?.maxChain ?? 0);
  } else {
    chain = 0;
    maxChain = existing?.maxChain ?? 0;
  }

  const multiplier = Math.min(MAX_MULTIPLIER, 1 + chain * MULTIPLIER_PER_CHAIN);

  const state: ComboState = {
    chain,
    maxChain,
    multiplier,
    lastGame: Date.now(),
  };

  await redis.set(key, JSON.stringify(state), "EX", COMBO_TTL);

  return state;
}
