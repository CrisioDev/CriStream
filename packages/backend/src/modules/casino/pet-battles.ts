import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Pet Battles (PvP)
 *
 * Players challenge each other with their active pets.
 * Pet power = (level * 10) + sum(equipped item bonuses) + rarity bonus.
 * Both roll 1-100 + power. Higher total wins the bet.
 */

import type { PetData } from "./pets.js";

const LEGENDARY_PET_IDS = new Set([
  "ghost_cat", "golden_dragon", "crystal_wolf", "shadow_phoenix", "cosmic_bunny",
]);

// Item bonus values by emoji (from ITEM_CATEGORIES tiers + lootbox items)
const ITEM_BONUS_MAP: Record<string, number> = {
  // Hats
  "🧢": 1, "🎩": 3, "🤠": 5, "👑": 8, "😇": 12, "⚜️": 20, "💎👑": 30,
  // Glasses
  "🕶️": 1, "🤓": 2, "🥽": 4, "🧐": 6, "🔴": 10, "🔮": 15,
  // Capes
  "🧣": 1, "🦸": 2, "🪽": 3, "🔥": 5, "🌑": 5, "🌈🪽": 8,
  // Weapons
  "🗡️": 3, "🪄": 5, "🎸": 8, "💎": 12, "🔱": 20, "♾️": 35, "⚡🗡️": 25,
  // Auras
  "✨": 1, "⚡": 3, "🌈": 5, "🌌": 8, "💥": 15, "🌠": 12,
  // Food
  "🍪": 5, "🍕": 10, "🍣": 15, "🥩": 25, "🍎": 40, "🏺": 60,
};

function battleKey(channelId: string): string {
  return `casino:battle:${channelId}`;
}

function historyKey(channelId: string): string {
  return `casino:battle:history:${channelId}`;
}

function petKey(channelId: string, userId: string): string {
  return `casino:pet:${channelId}:${userId}`;
}

/** Calculate a pet's battle power */
export async function calculatePetPower(channelId: string, userId: string): Promise<number> {
  const raw = await redis.get(petKey(channelId, userId));
  if (!raw) return 0;

  const data: PetData = JSON.parse(raw);
  const active = data.pets?.find(p => p.petId === data.activePetId);
  if (!active) return 0;

  let power = active.level * 10;

  // Equipped item bonuses
  if (data.equipped) {
    for (const emoji of Object.values(data.equipped)) {
      if (emoji && ITEM_BONUS_MAP[emoji]) {
        power += ITEM_BONUS_MAP[emoji]!;
      }
    }
  }

  // Legendary rarity bonus
  if (LEGENDARY_PET_IDS.has(active.petId)) {
    power += 50;
  }

  return power;
}

/** Create a battle challenge */
export async function createBattleChallenge(
  channelId: string, userId: string, displayName: string, bet: number,
): Promise<{ success: boolean; error?: string }> {
  // Check if user has a pet
  const raw = await redis.get(petKey(channelId, userId));
  if (!raw) return { success: false, error: "Du brauchst ein Pet für Kämpfe!" };

  const data: PetData = JSON.parse(raw);
  if (!data.pets?.length) return { success: false, error: "Du brauchst ein Pet für Kämpfe!" };

  // Check points
  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < bet) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${bet}.` };
  }
  if (bet < 10) return { success: false, error: "Mindesteinsatz: 10 Punkte!" };

  // Check for existing challenge
  const existing = await redis.get(battleKey(channelId));
  if (existing) return { success: false, error: "Es gibt bereits eine offene Herausforderung!" };

  const power = await calculatePetPower(channelId, userId);

  const challenge = {
    challengerId: userId,
    challengerName: displayName,
    challengerPetPower: power,
    bet,
    createdAt: Date.now(),
  };

  // Deduct bet from challenger
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: bet } },
  });

  await redis.set(battleKey(channelId), JSON.stringify(challenge), "EX", 120);
  return { success: true };
}

/** Accept an open battle challenge */
export async function acceptBattle(
  channelId: string, challengerId: string, acceptorId: string, acceptorName: string,
): Promise<{
  success: boolean; winner?: string; winnerName?: string; loserName?: string; bet?: number;
  challengerRoll?: number; acceptorRoll?: number; challengerPower?: number; acceptorPower?: number;
  error?: string;
}> {
  const raw = await redis.get(battleKey(channelId));
  if (!raw) return { success: false, error: "Keine offene Herausforderung gefunden!" };

  const challenge = JSON.parse(raw);
  if (challenge.challengerId !== challengerId) {
    return { success: false, error: "Herausforderung nicht gefunden!" };
  }
  if (acceptorId === challengerId) {
    return { success: false, error: "Du kannst dich nicht selbst herausfordern!" };
  }

  // Check acceptor has pet
  const acceptorPetRaw = await redis.get(petKey(channelId, acceptorId));
  if (!acceptorPetRaw) return { success: false, error: "Du brauchst ein Pet für Kämpfe!" };

  // Check acceptor has enough points
  const bet = challenge.bet;
  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: acceptorId } },
  });
  if (!channelUser || channelUser.points < bet) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${bet}.` };
  }

  // Deduct bet from acceptor
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: acceptorId } },
    data: { points: { decrement: bet } },
  });

  // Calculate powers and rolls
  const challengerPower = challenge.challengerPetPower;
  const acceptorPower = await calculatePetPower(channelId, acceptorId);

  const challengerRoll = Math.floor(Math.random() * 100) + 1;
  const acceptorRoll = Math.floor(Math.random() * 100) + 1;

  const challengerTotal = challengerRoll + challengerPower;
  const acceptorTotal = acceptorRoll + acceptorPower;

  const winnerIsChallenger = challengerTotal >= acceptorTotal;
  const winnerId = winnerIsChallenger ? challenge.challengerId : acceptorId;
  const winnerName = winnerIsChallenger ? challenge.challengerName : acceptorName;
  const loserName = winnerIsChallenger ? acceptorName : challenge.challengerName;

  // Winner gets both bets
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: winnerId } },
    data: { points: { increment: bet * 2 } },
  });

  // Record history
  const historyEntry = JSON.stringify({
    challenger: challenge.challengerName,
    acceptor: acceptorName,
    winner: winnerName,
    loser: loserName,
    bet,
    challengerRoll, acceptorRoll, challengerPower, acceptorPower,
    time: Date.now(),
  });
  await redis.lpush(historyKey(channelId), historyEntry);
  await redis.ltrim(historyKey(channelId), 0, 9);
  await redis.expire(historyKey(channelId), 604800); // 7 days

  // Remove challenge
  await redis.del(battleKey(channelId));

  return {
    success: true,
    winner: winnerId,
    winnerName,
    loserName,
    bet,
    challengerRoll,
    acceptorRoll,
    challengerPower,
    acceptorPower,
  };
}

/** Get the current open battle challenge */
export async function getOpenBattle(channelId: string): Promise<any | null> {
  const raw = await redis.get(battleKey(channelId));
  if (!raw) return null;
  const data = JSON.parse(raw);
  data.timeLeft = Math.max(0, 120 - Math.floor((Date.now() - data.createdAt) / 1000));
  return data;
}

/** Get last 10 battle results */
export async function getBattleHistory(channelId: string): Promise<any[]> {
  const raw = await redis.lrange(historyKey(channelId), 0, 9);
  return raw.map((r: string) => JSON.parse(r));
}
