import { redis } from "../../lib/redis.js";

export interface PlayerStats {
  totalPlays: number;
  totalWins: number;
  totalPointsWon: number;
  totalPointsLost: number;
  currentStreak: number;
  maxStreak: number;
  lossStreak: number;
  maxLossStreak: number;
  slotsPlayed: number;
  slotsWon: number;
  scratchPlayed: number;
  scratchWon: number;
  flipPlayed: number;
  flipWon: number;
  triplesHit: number;
  jackpots777: number;
  doublesWon: number;
  doublesPlayed: number;
  maxDoubleStreak: number;
  maxDoubleAmount: number;
  mysteryBoxes: number;
  bossesKilled: number;
  bossDamageDealt: number;
  specialsTriggered: number;
  questsCompleted: number;
  daysPlayed: number;
  gluecksradSpins: number;
  giftsTriggered: number;
  mitleidReceived: number;
  katzeTriggered: number;
  cursedTriggered: number;
  nearMisses: number;
  rageQuitBonuses: number;
  allInsPlayed: number;
  allInsWon: number;
  heistsPlayed: number;
  heistsWon: number;
  totalDoubleStreak: number;
  lastPlayDate: string;
  dice21Played: number;
  dice21Won: number;
  overUnderPlayed: number;
  overUnderWon: number;
  minigamesPlayed: number;
  tierSlotsPlayed: number;
  prestigeLevel: number;
  breedsDone: number;
  storyCompleted: number;
  storyEndingKing: number;
  storyEndingFree: number;
  storyEndingSacrifice: number;
  storyEndingEternal: number;
}

const DEFAULT_STATS: PlayerStats = {
  totalPlays: 0,
  totalWins: 0,
  totalPointsWon: 0,
  totalPointsLost: 0,
  currentStreak: 0,
  maxStreak: 0,
  lossStreak: 0,
  maxLossStreak: 0,
  slotsPlayed: 0,
  slotsWon: 0,
  scratchPlayed: 0,
  scratchWon: 0,
  flipPlayed: 0,
  flipWon: 0,
  triplesHit: 0,
  jackpots777: 0,
  doublesWon: 0,
  doublesPlayed: 0,
  maxDoubleStreak: 0,
  maxDoubleAmount: 0,
  mysteryBoxes: 0,
  bossesKilled: 0,
  bossDamageDealt: 0,
  specialsTriggered: 0,
  questsCompleted: 0,
  daysPlayed: 0,
  gluecksradSpins: 0,
  giftsTriggered: 0,
  mitleidReceived: 0,
  katzeTriggered: 0,
  cursedTriggered: 0,
  nearMisses: 0,
  rageQuitBonuses: 0,
  allInsPlayed: 0,
  allInsWon: 0,
  heistsPlayed: 0,
  heistsWon: 0,
  totalDoubleStreak: 0,
  lastPlayDate: "",
  dice21Played: 0,
  dice21Won: 0,
  overUnderPlayed: 0,
  overUnderWon: 0,
  minigamesPlayed: 0,
  tierSlotsPlayed: 0,
  prestigeLevel: 0,
  breedsDone: 0,
  storyCompleted: 0,
  storyEndingKing: 0,
  storyEndingFree: 0,
  storyEndingSacrifice: 0,
  storyEndingEternal: 0,
};

function statsKey(channelId: string, userId: string): string {
  return `casino:stats:${channelId}:${userId}`;
}

export async function getStats(channelId: string, userId: string): Promise<PlayerStats> {
  const raw = await redis.get(statsKey(channelId, userId));
  if (!raw) return { ...DEFAULT_STATS };
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function updateStats(
  channelId: string,
  userId: string,
  update: Partial<PlayerStats>,
): Promise<PlayerStats> {
  const current = await getStats(channelId, userId);
  const merged = { ...current, ...update };
  await redis.set(statsKey(channelId, userId), JSON.stringify(merged));
  return merged;
}

export async function recordPlay(
  channelId: string,
  userId: string,
  data: {
    game: "flip" | "slots" | "scratch" | "double" | "allin" | "dice21" | "overunder" | "minigame" | "tier_slots";
    win: boolean;
    payout: number;
    cost: number;
    isTriple?: boolean;
    is777?: boolean;
    specials?: string[];
  },
): Promise<PlayerStats> {
  const stats = await getStats(channelId, userId);

  // Total counters
  stats.totalPlays++;
  if (data.win) stats.totalWins++;

  if (data.payout > data.cost) {
    stats.totalPointsWon += data.payout - data.cost;
  } else {
    stats.totalPointsLost += data.cost - data.payout;
  }

  // Game-specific counters
  switch (data.game) {
    case "flip":
      stats.flipPlayed++;
      if (data.win) stats.flipWon++;
      break;
    case "slots":
      stats.slotsPlayed++;
      if (data.win) stats.slotsWon++;
      break;
    case "scratch":
      stats.scratchPlayed++;
      if (data.win) stats.scratchWon++;
      break;
    case "double":
      stats.doublesPlayed++;
      if (data.win) {
        stats.doublesWon++;
        stats.totalDoubleStreak++;
        if (stats.totalDoubleStreak > stats.maxDoubleStreak) {
          stats.maxDoubleStreak = stats.totalDoubleStreak;
        }
        if (data.payout > stats.maxDoubleAmount) {
          stats.maxDoubleAmount = data.payout;
        }
      } else {
        stats.totalDoubleStreak = 0;
      }
      break;
    case "allin":
      stats.allInsPlayed++;
      if (data.win) stats.allInsWon++;
      break;
    case "dice21":
      stats.dice21Played++;
      if (data.win) stats.dice21Won++;
      break;
    case "overunder":
      stats.overUnderPlayed++;
      if (data.win) stats.overUnderWon++;
      break;
    case "minigame":
      stats.minigamesPlayed++;
      break;
    case "tier_slots":
      stats.tierSlotsPlayed++;
      break;
  }

  // Streaks
  if (data.win) {
    stats.currentStreak++;
    stats.lossStreak = 0;
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }
  } else {
    stats.lossStreak++;
    stats.currentStreak = 0;
    if (stats.lossStreak > stats.maxLossStreak) {
      stats.maxLossStreak = stats.lossStreak;
    }
  }

  // Triples & 777
  if (data.isTriple) stats.triplesHit++;
  if (data.is777) stats.jackpots777++;

  // Specials
  if (data.specials && data.specials.length > 0) {
    stats.specialsTriggered += data.specials.length;
    for (const s of data.specials) {
      if (s === "mystery_box") stats.mysteryBoxes++;
      if (s === "boss_kill") stats.bossesKilled++;
      if (s === "boss_damage") stats.bossDamageDealt++;
      if (s === "geschenk_an_chat") stats.giftsTriggered++;
      if (s === "mitleid") stats.mitleidReceived++;
      if (s === "schwarze_katze") stats.katzeTriggered++;
      if (s === "verfluchte_muenze") stats.cursedTriggered++;
      if (s === "beinahe_jackpot") stats.nearMisses++;
      if (s === "ragequit") stats.rageQuitBonuses++;
    }
  }

  // Days played
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastPlayDate !== today) {
    stats.daysPlayed++;
    stats.lastPlayDate = today;
  }

  await redis.set(statsKey(channelId, userId), JSON.stringify(stats));
  return stats;
}
