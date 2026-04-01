import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Modular Quest Builder System
 *
 * Quests are generated from combinable building blocks:
 * [Action] + [Game] + [Amount] + [Modifier]
 *
 * This creates thousands of unique combinations instead of a fixed list.
 */

export interface Quest {
  id: string;
  name: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  rewardType: "points";
  done: boolean;
  difficulty: "easy" | "medium" | "hard" | "bonus";
  trackKey: string;
}

// ── Building Blocks ──

type Action = "play" | "win" | "streak" | "collect" | "trigger" | "survive";
type Game = "any" | "flip" | "slots" | "scratch" | "double" | "allin";
type Modifier = "none" | "in_a_row" | "without_loss" | "with_free" | "triples" | "specials";

interface QuestTemplate {
  action: Action;
  games: Game[];
  amounts: number[];
  modifiers: Modifier[];
  difficulty: "easy" | "medium" | "hard" | "bonus";
  rewardBase: number; // multiplied by amount scaling
}

const TEMPLATES: QuestTemplate[] = [
  // EASY templates
  { action: "play", games: ["any"], amounts: [3, 5, 7, 10], modifiers: ["none"], difficulty: "easy", rewardBase: 3 },
  { action: "play", games: ["flip", "slots", "scratch"], amounts: [3, 5, 8], modifiers: ["none"], difficulty: "easy", rewardBase: 4 },
  { action: "win", games: ["any"], amounts: [1, 2, 3], modifiers: ["none"], difficulty: "easy", rewardBase: 8 },
  { action: "win", games: ["flip"], amounts: [2, 3, 5], modifiers: ["none"], difficulty: "easy", rewardBase: 6 },

  // MEDIUM templates
  { action: "win", games: ["slots", "scratch"], amounts: [2, 3, 4], modifiers: ["none"], difficulty: "medium", rewardBase: 15 },
  { action: "win", games: ["flip"], amounts: [5, 7, 10], modifiers: ["none"], difficulty: "medium", rewardBase: 8 },
  { action: "streak", games: ["any"], amounts: [3, 4], modifiers: ["in_a_row"], difficulty: "medium", rewardBase: 15 },
  { action: "collect", games: ["any"], amounts: [50, 75, 100], modifiers: ["none"], difficulty: "medium", rewardBase: 0.5 },
  { action: "play", games: ["any"], amounts: [10, 15, 20], modifiers: ["none"], difficulty: "medium", rewardBase: 3 },
  { action: "play", games: ["double"], amounts: [2, 3, 5], modifiers: ["none"], difficulty: "medium", rewardBase: 12 },
  { action: "win", games: ["double"], amounts: [1, 2], modifiers: ["none"], difficulty: "medium", rewardBase: 25 },
  { action: "trigger", games: ["any"], amounts: [1, 2], modifiers: ["specials"], difficulty: "medium", rewardBase: 20 },

  // HARD templates
  { action: "streak", games: ["any"], amounts: [5, 7, 8], modifiers: ["in_a_row"], difficulty: "hard", rewardBase: 18 },
  { action: "win", games: ["slots", "scratch"], amounts: [5, 7], modifiers: ["none"], difficulty: "hard", rewardBase: 18 },
  { action: "collect", games: ["any"], amounts: [150, 200, 300, 500], modifiers: ["none"], difficulty: "hard", rewardBase: 0.4 },
  { action: "play", games: ["any"], amounts: [25, 30, 40], modifiers: ["none"], difficulty: "hard", rewardBase: 3 },
  { action: "win", games: ["double"], amounts: [3, 4, 5], modifiers: ["none"], difficulty: "hard", rewardBase: 25 },
  { action: "trigger", games: ["any"], amounts: [3, 5], modifiers: ["specials"], difficulty: "hard", rewardBase: 20 },
  { action: "play", games: ["flip", "slots", "scratch"], amounts: [10, 15, 20], modifiers: ["none"], difficulty: "hard", rewardBase: 5 },
  { action: "win", games: ["any"], amounts: [10, 15, 20], modifiers: ["none"], difficulty: "hard", rewardBase: 6 },
  { action: "survive", games: ["any"], amounts: [10, 15], modifiers: ["without_loss"], difficulty: "hard", rewardBase: 8 },

  // BONUS templates (rare, high reward)
  { action: "streak", games: ["any"], amounts: [10, 12, 15], modifiers: ["in_a_row"], difficulty: "bonus", rewardBase: 20 },
  { action: "win", games: ["allin"], amounts: [1], modifiers: ["none"], difficulty: "bonus", rewardBase: 200 },
  { action: "collect", games: ["any"], amounts: [500, 1000], modifiers: ["none"], difficulty: "bonus", rewardBase: 0.3 },
  { action: "trigger", games: ["any"], amounts: [1], modifiers: ["triples"], difficulty: "bonus", rewardBase: 100 },
  { action: "win", games: ["any"], amounts: [25, 30], modifiers: ["none"], difficulty: "bonus", rewardBase: 6 },
];

const GAME_NAMES: Record<Game, string> = {
  any: "beliebige", flip: "Flip", slots: "Slot", scratch: "Rubbellos", double: "Double", allin: "All-In",
};

const ACTION_VERBS: Record<Action, string> = {
  play: "Spiele", win: "Gewinne", streak: "Gewinne", collect: "Sammle", trigger: "Löse", survive: "Überlebe",
};

function generateQuestFromTemplate(template: QuestTemplate): Quest {
  const game = template.games[Math.floor(Math.random() * template.games.length)]!;
  const amount = template.amounts[Math.floor(Math.random() * template.amounts.length)]!;
  const modifier = template.modifiers[Math.floor(Math.random() * template.modifiers.length)]!;

  const gameName = GAME_NAMES[game];
  const action = ACTION_VERBS[template.action];
  const reward = Math.round(Math.max(10, template.rewardBase * amount));

  let name: string;
  let description: string;
  let trackKey: string;

  switch (template.action) {
    case "play":
      name = `${amount}x ${gameName}`;
      description = `${action} ${amount} ${gameName} Spiele`;
      trackKey = game === "any" ? "play_any" : `play_${game}`;
      break;
    case "win":
      name = `${amount}x ${gameName} gewinnen`;
      description = `${action} ${amount} ${gameName} Spiele`;
      trackKey = game === "any" ? "win_any" : `win_${game}`;
      break;
    case "streak":
      name = `${amount}er Streak`;
      description = `${action} ${amount} Spiele in Folge`;
      trackKey = "streak";
      break;
    case "collect":
      name = `${amount} Punkte sammeln`;
      description = `${action} ${amount} Punkte durch Gewinne`;
      trackKey = "points_won";
      break;
    case "trigger":
      if (modifier === "triples") {
        name = "Triple erzielen";
        description = "Erziele einen Triple (Slots oder Scratch)";
        trackKey = "triple_any";
      } else {
        name = `${amount}x Special`;
        description = `${action} ${amount} Casino-Specials aus`;
        trackKey = "specials";
      }
      break;
    case "survive":
      name = `${amount} Spiele überleben`;
      description = `Spiele ${amount} Runden ohne alles zu verlieren`;
      trackKey = "play_any"; // counts plays, validated at check time
      break;
    default:
      name = "Quest";
      description = "Unbekannte Quest";
      trackKey = "play_any";
  }

  // Create unique ID from components
  const id = `${template.action}_${game}_${amount}_${modifier}_${Date.now() % 100000}`;

  return {
    id,
    name,
    description,
    target: amount,
    progress: 0,
    reward,
    rewardType: "points",
    done: false,
    difficulty: template.difficulty,
    trackKey,
  };
}

function questsKey(channelId: string, userId: string): string {
  return `casino:quests:${channelId}:${userId}`;
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
    } catch { /* regenerate */ }
  }

  // Generate 3 unique quests from templates
  const easyTemplates = TEMPLATES.filter(t => t.difficulty === "easy");
  const mediumTemplates = TEMPLATES.filter(t => t.difficulty === "medium");
  const hardTemplates = TEMPLATES.filter(t => t.difficulty === "hard");
  const bonusTemplates = TEMPLATES.filter(t => t.difficulty === "bonus");

  const useBonus = Math.random() < 0.10;

  const quests: Quest[] = [
    generateQuestFromTemplate(easyTemplates[Math.floor(Math.random() * easyTemplates.length)]!),
    generateQuestFromTemplate(mediumTemplates[Math.floor(Math.random() * mediumTemplates.length)]!),
    generateQuestFromTemplate(useBonus
      ? bonusTemplates[Math.floor(Math.random() * bonusTemplates.length)]!
      : hardTemplates[Math.floor(Math.random() * hardTemplates.length)]!
    ),
  ];

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
      case "play_allin":
        if (data.game === "allin") increment = 1;
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
      case "win_allin":
        if (data.isAllinWin) increment = 1;
        break;
      case "streak":
        if (data.streak !== undefined) {
          quest.progress = Math.max(quest.progress, data.streak);
          increment = 0;
        }
        break;
      case "points_won":
        if (data.pointsWon && data.pointsWon > 0) increment = data.pointsWon;
        break;
      case "specials":
        if (data.specialType) increment = 1;
        break;
      case "triple_any":
        if (data.isTriple) increment = 1;
        break;
      case "triple_slots":
        if (data.game === "slots" && data.isTriple) increment = 1;
        break;
      case "triple_scratch":
        if (data.game === "scratch" && data.isTriple) increment = 1;
        break;
      case "jackpot_777":
        if (data.is777) increment = 1;
        break;
      case "black_cat":
        if (data.specialType === "schwarze_katze") increment = 1;
        break;
      case "boss_damage":
        if (data.isBossHit) increment = 1;
        break;
      case "spin_wheel":
        if (data.isGluecksrad) increment = 1;
        break;
      case "buy_ticket":
        if (data.isTicketBuy) increment = 1;
        break;
    }

    if (increment > 0) {
      quest.progress += increment;
    }

    if (!quest.done && quest.progress >= quest.target) {
      quest.done = true;
      completed.push(quest);

      if (quest.reward > 0) {
        await prisma.channelUser.update({
          where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
          data: { points: { increment: quest.reward } },
        });
      }
    }
  }

  const key = questsKey(channelId, userId);
  const ttl = await redis.ttl(key);
  await redis.set(key, JSON.stringify(quests), "EX", ttl > 0 ? ttl : ttlUntilMidnight());

  return { completed };
}
