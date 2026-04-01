import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

export interface Quest {
  id: string;
  name: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  rewardType: "points" | "lootbox";
  done: boolean;
  difficulty: "easy" | "medium" | "hard" | "bonus";
  trackKey: string; // internal tracking key
}

interface QuestDef {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: number;
  rewardType: "points" | "lootbox";
  difficulty: "easy" | "medium" | "hard" | "bonus";
  trackKey: string;
}

// ── Quest Pool ──

const EASY_QUESTS: QuestDef[] = [
  { id: "play_any_5", name: "5 Spiele", description: "Spiele 5 beliebige Casino-Spiele", target: 5, reward: 15, rewardType: "points", difficulty: "easy", trackKey: "play_any" },
  { id: "play_any_10", name: "10 Spiele", description: "Spiele 10 beliebige Casino-Spiele", target: 10, reward: 20, rewardType: "points", difficulty: "easy", trackKey: "play_any" },
  { id: "play_slots_3", name: "Slot-Fan", description: "Spiele 3 Slots", target: 3, reward: 15, rewardType: "points", difficulty: "easy", trackKey: "play_slots" },
  { id: "play_scratch_3", name: "Kratzer", description: "Spiele 3 Rubbellose", target: 3, reward: 15, rewardType: "points", difficulty: "easy", trackKey: "play_scratch" },
  { id: "play_flip_10", name: "Flip-Marathon", description: "Spiele 10 Flips", target: 10, reward: 20, rewardType: "points", difficulty: "easy", trackKey: "play_flip" },
  { id: "play_flip_5", name: "Flip-Runde", description: "Spiele 5 Flips", target: 5, reward: 15, rewardType: "points", difficulty: "easy", trackKey: "play_flip" },
  { id: "spin_wheel", name: "Raddreher", description: "Drehe das Glücksrad", target: 1, reward: 15, rewardType: "points", difficulty: "easy", trackKey: "spin_wheel" },
  { id: "win_any_3", name: "3 Siege", description: "Gewinne 3 beliebige Spiele", target: 3, reward: 20, rewardType: "points", difficulty: "easy", trackKey: "win_any" },
  { id: "play_double_2", name: "Doppelt!", description: "Spiele 2 Double-or-Nothing", target: 2, reward: 20, rewardType: "points", difficulty: "easy", trackKey: "play_double" },
  { id: "visit_casino", name: "Casino-Besucher", description: "Spiele 1 Casino-Spiel", target: 1, reward: 15, rewardType: "points", difficulty: "easy", trackKey: "play_any" },
];

const MEDIUM_QUESTS: QuestDef[] = [
  { id: "win_slots_3", name: "Slot-Gewinner", description: "Gewinne 3 Slots", target: 3, reward: 40, rewardType: "points", difficulty: "medium", trackKey: "win_slots" },
  { id: "win_flip_5", name: "Flip-König", description: "Gewinne 5 Flips", target: 5, reward: 35, rewardType: "points", difficulty: "medium", trackKey: "win_flip" },
  { id: "win_scratch_2", name: "Rubbellos-Glück", description: "Gewinne 2 Rubbellose", target: 2, reward: 40, rewardType: "points", difficulty: "medium", trackKey: "win_scratch" },
  { id: "collect_50_points", name: "Punktesammler", description: "Gewinne 50 Punkte heute", target: 50, reward: 30, rewardType: "points", difficulty: "medium", trackKey: "points_won" },
  { id: "play_3_games", name: "Allrounder", description: "Spiele 3 verschiedene Spieltypen", target: 3, reward: 40, rewardType: "points", difficulty: "medium", trackKey: "game_types" },
  { id: "double_success", name: "Double-Erfolg", description: "Gewinne 2 Double-or-Nothing", target: 2, reward: 45, rewardType: "points", difficulty: "medium", trackKey: "win_double" },
  { id: "streak_3", name: "3er Streak", description: "Gewinne 3 Spiele in Folge", target: 3, reward: 40, rewardType: "points", difficulty: "medium", trackKey: "streak" },
  { id: "play_15_rounds", name: "Ausdauer", description: "Spiele 15 Runden", target: 15, reward: 50, rewardType: "points", difficulty: "medium", trackKey: "play_any" },
  { id: "boss_damage_50", name: "Boss-Schaden", description: "Verursache Schaden am Boss", target: 1, reward: 35, rewardType: "points", difficulty: "medium", trackKey: "boss_damage" },
  { id: "buy_ticket", name: "Ticket-Käufer", description: "Kaufe ein Bingo oder Lotto Ticket", target: 1, reward: 30, rewardType: "points", difficulty: "medium", trackKey: "buy_ticket" },
];

const HARD_QUESTS: QuestDef[] = [
  { id: "streak_5", name: "5er Streak", description: "Gewinne 5 Spiele in Folge", target: 5, reward: 80, rewardType: "points", difficulty: "hard", trackKey: "streak" },
  { id: "triple_slots", name: "Slot-Triple", description: "Erziele einen Triple bei Slots", target: 1, reward: 100, rewardType: "points", difficulty: "hard", trackKey: "triple_slots" },
  { id: "triple_scratch", name: "Rubbellos-Triple", description: "Erziele einen Dreier beim Rubbellos", target: 1, reward: 100, rewardType: "points", difficulty: "hard", trackKey: "triple_scratch" },
  { id: "collect_200_points", name: "200 Punkte!", description: "Gewinne 200 Punkte heute", target: 200, reward: 100, rewardType: "points", difficulty: "hard", trackKey: "points_won" },
  { id: "double_3x", name: "3x Verdoppelt", description: "Gewinne 3 Double-or-Nothing", target: 3, reward: 100, rewardType: "points", difficulty: "hard", trackKey: "win_double" },
  { id: "trigger_2_specials", name: "Special-Jäger", description: "Löse 2 Specials aus", target: 2, reward: 75, rewardType: "points", difficulty: "hard", trackKey: "specials" },
  { id: "play_20_rounds", name: "20 Runden", description: "Spiele 20 Runden", target: 20, reward: 80, rewardType: "points", difficulty: "hard", trackKey: "play_any" },
  { id: "win_10_games", name: "10 Siege", description: "Gewinne 10 Spiele heute", target: 10, reward: 100, rewardType: "points", difficulty: "hard", trackKey: "win_any" },
  { id: "collect_500_points", name: "500 Punkte!", description: "Gewinne 500 Punkte heute", target: 500, reward: 150, rewardType: "points", difficulty: "hard", trackKey: "points_won" },
];

const BONUS_QUESTS: QuestDef[] = [
  { id: "bonus_jackpot_777", name: "JACKPOT Quest", description: "Erziele einen 777 Jackpot", target: 1, reward: 200, rewardType: "points", difficulty: "bonus", trackKey: "jackpot_777" },
  { id: "bonus_black_cat", name: "Katzen-Quest", description: "Begegne einer schwarzen Katze", target: 1, reward: 100, rewardType: "points", difficulty: "bonus", trackKey: "black_cat" },
  { id: "bonus_streak_10", name: "10er Streak Quest", description: "Gewinne 10 Spiele in Folge", target: 10, reward: 150, rewardType: "points", difficulty: "bonus", trackKey: "streak" },
  { id: "bonus_allin_win", name: "All-In Quest", description: "Gewinne ein All-In", target: 1, reward: 200, rewardType: "points", difficulty: "bonus", trackKey: "allin_win" },
];

function questsKey(channelId: string, userId: string): string {
  return `casino:quests:${channelId}:${userId}`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function ttlUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(60, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

export async function getDailyQuests(channelId: string, userId: string): Promise<Quest[]> {
  const key = questsKey(channelId, userId);
  const raw = await redis.get(key);

  if (raw) {
    try {
      return JSON.parse(raw) as Quest[];
    } catch {
      // corrupted, regenerate
    }
  }

  // Generate new daily quests: 1 easy, 1 medium, 1 hard (10% chance bonus replaces hard)
  const easy = pickRandom(EASY_QUESTS);
  const medium = pickRandom(MEDIUM_QUESTS);
  const useBonus = Math.random() < 0.10;
  const hard = useBonus ? pickRandom(BONUS_QUESTS) : pickRandom(HARD_QUESTS);

  const quests: Quest[] = [easy, medium, hard].map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    target: def.target,
    reward: def.reward,
    rewardType: def.rewardType,
    done: false,
    difficulty: def.difficulty,
    progress: 0,
    trackKey: def.trackKey,
  }));

  const ttl = ttlUntilMidnight();
  await redis.set(key, JSON.stringify(quests), "EX", ttl);
  return quests;
}

export async function updateQuestProgress(
  channelId: string,
  userId: string,
  data: {
    game?: string;
    win?: boolean;
    isTriple?: boolean;
    streak?: number;
    pointsWon?: number;
    specialType?: string;
    doubleWon?: boolean;
    is777?: boolean;
    isBossHit?: boolean;
    isTicketBuy?: boolean;
    isGluecksrad?: boolean;
    isAllinWin?: boolean;
  },
): Promise<{ completed: Quest[] }> {
  const quests = await getDailyQuests(channelId, userId);
  const completed: Quest[] = [];

  for (const quest of quests) {
    if (quest.done) continue;

    let increment = 0;

    switch (quest.trackKey) {
      case "play_any":
        if (data.game) increment = 1;
        break;
      case "play_slots":
        if (data.game === "slots") increment = 1;
        break;
      case "play_scratch":
        if (data.game === "scratch") increment = 1;
        break;
      case "play_flip":
        if (data.game === "flip") increment = 1;
        break;
      case "play_double":
        if (data.game === "double") increment = 1;
        break;
      case "win_any":
        if (data.win) increment = 1;
        break;
      case "win_slots":
        if (data.game === "slots" && data.win) increment = 1;
        break;
      case "win_scratch":
        if (data.game === "scratch" && data.win) increment = 1;
        break;
      case "win_flip":
        if (data.game === "flip" && data.win) increment = 1;
        break;
      case "win_double":
        if (data.doubleWon) increment = 1;
        break;
      case "streak":
        if (data.streak !== undefined) {
          // Set to current streak value rather than increment
          quest.progress = data.streak;
          increment = 0; // handled directly
        }
        break;
      case "points_won":
        if (data.pointsWon && data.pointsWon > 0) increment = data.pointsWon;
        break;
      case "specials":
        if (data.specialType) increment = 1;
        break;
      case "triple_slots":
        if (data.game === "slots" && data.isTriple) increment = 1;
        break;
      case "triple_scratch":
        if (data.game === "scratch" && data.isTriple) increment = 1;
        break;
      case "game_types": {
        // Track unique game types played today via separate redis key
        if (data.game) {
          const typesKey = `casino:quest:types:${channelId}:${userId}`;
          await redis.sadd(typesKey, data.game);
          await redis.expire(typesKey, ttlUntilMidnight());
          const count = await redis.scard(typesKey);
          quest.progress = count;
          increment = 0; // handled directly
        }
        break;
      }
      case "spin_wheel":
        if (data.isGluecksrad) increment = 1;
        break;
      case "boss_damage":
        if (data.isBossHit) increment = 1;
        break;
      case "buy_ticket":
        if (data.isTicketBuy) increment = 1;
        break;
      case "jackpot_777":
        if (data.is777) increment = 1;
        break;
      case "black_cat":
        if (data.specialType === "schwarze_katze") increment = 1;
        break;
      case "allin_win":
        if (data.isAllinWin) increment = 1;
        break;
    }

    if (increment > 0) {
      quest.progress += increment;
    }

    if (!quest.done && quest.progress >= quest.target) {
      quest.done = true;
      completed.push(quest);

      // Award reward
      if (quest.rewardType === "points" && quest.reward > 0) {
        await prisma.channelUser.update({
          where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
          data: { points: { increment: quest.reward } },
        });
      }
    }
  }

  // Save updated quest progress
  const key = questsKey(channelId, userId);
  const ttl = await redis.ttl(key);
  await redis.set(key, JSON.stringify(quests), "EX", ttl > 0 ? ttl : ttlUntilMidnight());

  return { completed };
}
