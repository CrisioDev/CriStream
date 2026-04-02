export interface CasinoSpecial {
  type: string;
  points?: number;
  message: string;
  animationData?: Record<string, any>;
}

export interface Quest {
  id: string;
  name: string;
  target: number;
  progress: number;
  reward: number;
  done: boolean;
  difficulty: "easy" | "medium" | "hard" | "bonus";
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  unlockedAt?: string;
  reward: number;
}

export interface PlayerStats {
  totalPlays: number;
  totalWins: number;
  totalPointsWon: number;
  totalPointsLost: number;
  maxStreak: number;
  currentStreak: number;
  maxLossStreak: number;
  slotsPlayed: number;
  scratchPlayed: number;
  flipPlayed: number;
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
  allInsPlayed: number;
  allInsWon: number;
  heistsPlayed: number;
  [key: string]: any;
}

export interface SeasonReward { level: number; type: "points" | "title" | "lootbox" | "autoflip"; value: string | number; premium: boolean; }
export interface SeasonData {
  season: { name: string; number: number; startDate: string; endDate: string; rewards: SeasonReward[] };
  progress: { xp: number; xpIntoCurrentLevel?: number; level: number; premium: boolean; claimedLevels: number[] };
  nextLevelXp: number;
}

export interface HeistState {
  active: boolean;
  phase?: "lobby" | "playing" | "betrayal" | "finished";
  players?: { userId: string; displayName: string; ready?: boolean; result?: any }[];
  countdown?: number;
  round?: number;
  totalRounds?: number;
  pot?: number;
  results?: { displayName: string; payout: number; betrayed?: boolean }[];
  createdBy?: string;
}

export interface Progression {
  stats: PlayerStats;
  newAchievements: { id: string; name: string; reward: number }[];
  questUpdates: { id: string; name: string; progress: number; target: number; done: boolean; reward: number }[];
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
  seasonRewards: any[];
}
