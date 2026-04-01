import { prisma } from "../../lib/prisma.js";
import type { PlayerStats } from "./stats.js";

interface AchievementReward {
  points?: number;
  title?: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: "start" | "milestone" | "luck" | "pech" | "specials" | "double" | "social" | "grind" | "legendary";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  reward: AchievementReward;
  check: (stats: PlayerStats) => boolean;
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  reward: AchievementReward;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── START (common) ──
  { id: "first_play", name: "Erster Versuch", description: "Spiele dein erstes Casino-Spiel", category: "start", rarity: "common", reward: { points: 5 }, check: (s) => s.totalPlays >= 1 },
  { id: "first_win", name: "Anfängerglück", description: "Gewinne dein erstes Spiel", category: "start", rarity: "common", reward: { points: 10 }, check: (s) => s.totalWins >= 1 },
  { id: "first_flip", name: "Münzwerfer", description: "Spiele deinen ersten Flip", category: "start", rarity: "common", reward: { points: 5 }, check: (s) => s.flipPlayed >= 1 },
  { id: "first_slots", name: "Slot-Anfänger", description: "Spiele deinen ersten Slot", category: "start", rarity: "common", reward: { points: 5 }, check: (s) => s.slotsPlayed >= 1 },
  { id: "first_scratch", name: "Kratzer", description: "Spiele dein erstes Rubbellos", category: "start", rarity: "common", reward: { points: 5 }, check: (s) => s.scratchPlayed >= 1 },
  { id: "first_double", name: "Doppler", description: "Gewinne dein erstes Double-or-Nothing", category: "start", rarity: "common", reward: { points: 10 }, check: (s) => s.doublesWon >= 1 },

  // ── MILESTONE ──
  { id: "club_10", name: "Club der 10", description: "Spiele 10 Casino-Spiele", category: "milestone", rarity: "common", reward: { points: 10 }, check: (s) => s.totalPlays >= 10 },
  { id: "club_50", name: "Stammgast", description: "Spiele 50 Casino-Spiele", category: "milestone", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.totalPlays >= 50 },
  { id: "club_100", name: "Club der 100", description: "Spiele 100 Casino-Spiele", category: "milestone", rarity: "uncommon", reward: { points: 50, title: "Casino-Stammgast" }, check: (s) => s.totalPlays >= 100 },
  { id: "club_250", name: "Hardcore Gambler", description: "Spiele 250 Casino-Spiele", category: "milestone", rarity: "rare", reward: { points: 100, title: "Hardcore Gambler" }, check: (s) => s.totalPlays >= 250 },
  { id: "club_500", name: "Casino-Veteran", description: "Spiele 500 Casino-Spiele", category: "milestone", rarity: "epic", reward: { points: 200, title: "Casino-Veteran" }, check: (s) => s.totalPlays >= 500 },
  { id: "club_1000", name: "Casino-Legende", description: "Spiele 1000 Casino-Spiele", category: "milestone", rarity: "legendary", reward: { points: 500, title: "Casino-Legende" }, check: (s) => s.totalPlays >= 1000 },
  { id: "wins_50", name: "Gewinner-Typ", description: "Gewinne 50 Spiele", category: "milestone", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.totalWins >= 50 },
  { id: "wins_100", name: "Glückspilz", description: "Gewinne 100 Spiele", category: "milestone", rarity: "rare", reward: { points: 75, title: "Glückspilz" }, check: (s) => s.totalWins >= 100 },
  { id: "wins_250", name: "Goldkind", description: "Gewinne 250 Spiele", category: "milestone", rarity: "epic", reward: { points: 150, title: "Goldkind" }, check: (s) => s.totalWins >= 250 },
  { id: "days_7", name: "Wochenspieler", description: "Spiele an 7 verschiedenen Tagen", category: "milestone", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.daysPlayed >= 7 },
  { id: "days_30", name: "Monatsspieler", description: "Spiele an 30 verschiedenen Tagen", category: "milestone", rarity: "rare", reward: { points: 100, title: "Dauergast" }, check: (s) => s.daysPlayed >= 30 },

  // ── LUCK ──
  { id: "triple_threat", name: "Triple Threat", description: "Erziele deinen ersten Triple", category: "luck", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.triplesHit >= 1 },
  { id: "triple_master", name: "Triple-Meister", description: "Erziele 10 Triples", category: "luck", rarity: "rare", reward: { points: 75, title: "Triple-Meister" }, check: (s) => s.triplesHit >= 10 },
  { id: "triple_god", name: "Triple-Gott", description: "Erziele 50 Triples", category: "luck", rarity: "legendary", reward: { points: 250, title: "Triple-Gott" }, check: (s) => s.triplesHit >= 50 },
  { id: "jackpot_777", name: "JACKPOT!", description: "Erziele einen 777 Jackpot", category: "luck", rarity: "legendary", reward: { points: 200, title: "Jackpot-König" }, check: (s) => s.jackpots777 >= 1 },
  { id: "jackpot_777_5", name: "Jackpot-Jäger", description: "Erziele 5 Jackpots (777)", category: "luck", rarity: "legendary", reward: { points: 500, title: "Jackpot-Jäger" }, check: (s) => s.jackpots777 >= 5 },
  { id: "streak_3", name: "Dreierkette", description: "Gewinne 3 Spiele in Folge", category: "luck", rarity: "common", reward: { points: 15 }, check: (s) => s.maxStreak >= 3 },
  { id: "streak_5", name: "Heißer Lauf", description: "Gewinne 5 Spiele in Folge", category: "luck", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.maxStreak >= 5 },
  { id: "streak_10", name: "Unaufhaltsam", description: "Gewinne 10 Spiele in Folge", category: "luck", rarity: "epic", reward: { points: 100, title: "Unaufhaltsam" }, check: (s) => s.maxStreak >= 10 },
  { id: "streak_20", name: "Glücksgott", description: "Gewinne 20 Spiele in Folge", category: "luck", rarity: "legendary", reward: { points: 300, title: "Glücksgott" }, check: (s) => s.maxStreak >= 20 },
  { id: "flip_master", name: "Flip-Meister", description: "Gewinne 100 Flips", category: "luck", rarity: "rare", reward: { points: 50, title: "Flip-Meister" }, check: (s) => s.flipWon >= 100 },
  { id: "slot_master", name: "Slot-Meister", description: "Gewinne 50 Slots", category: "luck", rarity: "rare", reward: { points: 75, title: "Slot-Meister" }, check: (s) => s.slotsWon >= 50 },
  { id: "scratch_master", name: "Rubbellos-Meister", description: "Gewinne 50 Rubbellose", category: "luck", rarity: "rare", reward: { points: 75, title: "Rubbellos-Meister" }, check: (s) => s.scratchWon >= 50 },

  // ── PECH ──
  { id: "loss_streak_5", name: "Pechsträhne", description: "Verliere 5 Spiele in Folge", category: "pech", rarity: "common", reward: { points: 10 }, check: (s) => s.maxLossStreak >= 5 },
  { id: "loss_streak_10", name: "Pechvogel", description: "Verliere 10 Spiele in Folge", category: "pech", rarity: "uncommon", reward: { points: 25, title: "Pechvogel" }, check: (s) => s.maxLossStreak >= 10 },
  { id: "loss_streak_20", name: "Pech-Legende", description: "Verliere 20 Spiele in Folge", category: "pech", rarity: "epic", reward: { points: 75, title: "Pech-Legende" }, check: (s) => s.maxLossStreak >= 20 },
  { id: "near_miss_10", name: "So knapp!", description: "10 Beinahe-Jackpots", category: "pech", rarity: "uncommon", reward: { points: 20 }, check: (s) => s.nearMisses >= 10 },
  { id: "near_miss_50", name: "Immer knapp daneben", description: "50 Beinahe-Jackpots", category: "pech", rarity: "rare", reward: { points: 75, title: "Knapp daneben" }, check: (s) => s.nearMisses >= 50 },
  { id: "lost_1000", name: "1000 verbrannt", description: "Verliere insgesamt 1000 Punkte", category: "pech", rarity: "uncommon", reward: { points: 50 }, check: (s) => s.totalPointsLost >= 1000 },
  { id: "lost_5000", name: "Pleitegeier", description: "Verliere insgesamt 5000 Punkte", category: "pech", rarity: "rare", reward: { points: 100, title: "Pleitegeier" }, check: (s) => s.totalPointsLost >= 5000 },
  { id: "mitleid_5", name: "Bedauernswert", description: "Erhalte 5x Mitleids-Punkte", category: "pech", rarity: "common", reward: { points: 10 }, check: (s) => s.mitleidReceived >= 5 },
  { id: "rage_quit_5", name: "Rage Quit Profi", description: "Löse 5x den Rage-Quit Bonus aus", category: "pech", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.rageQuitBonuses >= 5 },

  // ── SPECIALS ──
  { id: "mystery_box", name: "Mystery Box!", description: "Öffne deine erste Mystery Box", category: "specials", rarity: "uncommon", reward: { points: 15 }, check: (s) => s.mysteryBoxes >= 1 },
  { id: "mystery_10", name: "Mystery-Sammler", description: "Öffne 10 Mystery Boxen", category: "specials", rarity: "rare", reward: { points: 50 }, check: (s) => s.mysteryBoxes >= 10 },
  { id: "boss_killer", name: "Boss-Killer", description: "Besiege deinen ersten Boss", category: "specials", rarity: "rare", reward: { points: 50, title: "Boss-Killer" }, check: (s) => s.bossesKilled >= 1 },
  { id: "boss_slayer", name: "Boss-Slayer", description: "Besiege 5 Bosse", category: "specials", rarity: "epic", reward: { points: 150, title: "Boss-Slayer" }, check: (s) => s.bossesKilled >= 5 },
  { id: "katze_fan", name: "Katzenfreund", description: "Begegne 3 schwarzen Katzen", category: "specials", rarity: "uncommon", reward: { points: 20 }, check: (s) => s.katzeTriggered >= 3 },
  { id: "cursed_collector", name: "Verfluchter Sammler", description: "Sammle 5 verfluchte Münzen", category: "specials", rarity: "uncommon", reward: { points: 20 }, check: (s) => s.cursedTriggered >= 5 },
  { id: "gluecksrad_7", name: "Raddreher", description: "Drehe 7x das Glücksrad", category: "specials", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.gluecksradSpins >= 7 },
  { id: "gluecksrad_30", name: "Glücksrad-Profi", description: "Drehe 30x das Glücksrad", category: "specials", rarity: "rare", reward: { points: 75, title: "Glücksrad-Profi" }, check: (s) => s.gluecksradSpins >= 30 },

  // ── DOUBLE ──
  { id: "double_5", name: "Verdoppler", description: "Gewinne 5 Double-or-Nothing", category: "double", rarity: "uncommon", reward: { points: 20 }, check: (s) => s.doublesWon >= 5 },
  { id: "double_25", name: "Double-Profi", description: "Gewinne 25 Double-or-Nothing", category: "double", rarity: "rare", reward: { points: 75, title: "Double-Profi" }, check: (s) => s.doublesWon >= 25 },
  { id: "double_streak_3", name: "Triple-Double", description: "3 Doubles in Folge", category: "double", rarity: "rare", reward: { points: 50 }, check: (s) => s.maxDoubleStreak >= 3 },
  { id: "double_streak_5", name: "5er Double-Streak", description: "5 Doubles in Folge", category: "double", rarity: "epic", reward: { points: 150, title: "Double-Streak-König" }, check: (s) => s.maxDoubleStreak >= 5 },
  { id: "double_big", name: "Fetter Gewinn", description: "Gewinne 500+ Punkte in einem Double", category: "double", rarity: "epic", reward: { points: 100 }, check: (s) => s.maxDoubleAmount >= 500 },

  // ── SOCIAL ──
  { id: "gifts_1", name: "Erster Geschenk-Regen", description: "Löse 1 Geschenk an Chat aus", category: "social", rarity: "uncommon", reward: { points: 15 }, check: (s) => s.giftsTriggered >= 1 },
  { id: "gifts_3", name: "Geschenke-Regen", description: "Löse 3 Geschenke an Chat aus", category: "social", rarity: "rare", reward: { points: 40, title: "Schenker" }, check: (s) => s.giftsTriggered >= 3 },
  { id: "gifts_10", name: "Santa Claus", description: "Löse 10 Geschenke an Chat aus", category: "social", rarity: "epic", reward: { points: 100, title: "Santa Claus" }, check: (s) => s.giftsTriggered >= 10 },
  { id: "heist_first", name: "Erster Heist", description: "Nimm an einem Heist teil", category: "social", rarity: "common", reward: { points: 10 }, check: (s) => s.heistsPlayed >= 1 },
  { id: "heist_5", name: "Heist-Profi", description: "Nimm an 5 Heists teil", category: "social", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.heistsPlayed >= 5 },
  { id: "heist_win_3", name: "Heist-Gewinner", description: "Gewinne 3 Heists", category: "social", rarity: "rare", reward: { points: 75, title: "Heist-Meister" }, check: (s) => s.heistsWon >= 3 },

  // ── GRIND ──
  { id: "quests_5", name: "Questfänger", description: "Schließe 5 tägliche Quests ab", category: "grind", rarity: "common", reward: { points: 15 }, check: (s) => s.questsCompleted >= 5 },
  { id: "quests_25", name: "Quest-Meister", description: "Schließe 25 tägliche Quests ab", category: "grind", rarity: "uncommon", reward: { points: 50, title: "Quest-Meister" }, check: (s) => s.questsCompleted >= 25 },
  { id: "quests_100", name: "Quest-Legende", description: "Schließe 100 tägliche Quests ab", category: "grind", rarity: "epic", reward: { points: 200, title: "Quest-Legende" }, check: (s) => s.questsCompleted >= 100 },
  { id: "won_1000", name: "Tausender", description: "Gewinne insgesamt 1000 Punkte", category: "grind", rarity: "uncommon", reward: { points: 50 }, check: (s) => s.totalPointsWon >= 1000 },
  { id: "won_5000", name: "Reicher Sack", description: "Gewinne insgesamt 5000 Punkte", category: "grind", rarity: "rare", reward: { points: 150, title: "Reicher Sack" }, check: (s) => s.totalPointsWon >= 5000 },
  { id: "won_25000", name: "Casino-Mogul", description: "Gewinne insgesamt 25000 Punkte", category: "grind", rarity: "legendary", reward: { points: 500, title: "Casino-Mogul" }, check: (s) => s.totalPointsWon >= 25000 },

  // ── LEGENDARY / ALL-IN ──
  { id: "allin_first", name: "All-In!", description: "Spiele dein erstes All-In", category: "legendary", rarity: "uncommon", reward: { points: 20 }, check: (s) => s.allInsPlayed >= 1 },
  { id: "allin_win", name: "All-In Gewinner", description: "Gewinne ein All-In", category: "legendary", rarity: "rare", reward: { points: 75, title: "All-In Gewinner" }, check: (s) => s.allInsWon >= 1 },
  { id: "allin_5_wins", name: "All-In Profi", description: "Gewinne 5 All-Ins", category: "legendary", rarity: "epic", reward: { points: 200, title: "All-In Profi" }, check: (s) => s.allInsWon >= 5 },
  { id: "specials_25", name: "Special-Magnet", description: "Löse 25 Specials aus", category: "legendary", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.specialsTriggered >= 25 },
  { id: "specials_100", name: "Special-Legende", description: "Löse 100 Specials aus", category: "legendary", rarity: "epic", reward: { points: 150, title: "Special-Legende" }, check: (s) => s.specialsTriggered >= 100 },
];

export async function checkAchievements(
  channelId: string,
  userId: string,
  stats: PlayerStats,
): Promise<UnlockedAchievement[]> {
  // Get already unlocked
  const existing = await prisma.viewerAchievement.findMany({
    where: { channelId, twitchUserId: userId },
    select: { achievementId: true },
  });
  const unlockedSet = new Set(existing.map((a) => a.achievementId));

  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlockedSet.has(ach.id)) continue;
    if (!ach.check(stats)) continue;

    // Newly unlocked!
    try {
      await prisma.viewerAchievement.create({
        data: {
          channelId,
          twitchUserId: userId,
          achievementId: ach.id,
        },
      });
    } catch {
      // Unique constraint = already exists, skip
      continue;
    }

    // Award points
    if (ach.reward.points) {
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
        data: { points: { increment: ach.reward.points } },
      });
    }

    // Award title
    if (ach.reward.title) {
      await prisma.activeTitle.upsert({
        where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
        create: { channelId, twitchUserId: userId, title: ach.reward.title },
        update: { title: ach.reward.title },
      });
    }

    newlyUnlocked.push({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      category: ach.category,
      rarity: ach.rarity,
      reward: ach.reward,
    });
  }

  return newlyUnlocked;
}

export async function getPlayerAchievements(
  channelId: string,
  userId: string,
): Promise<{ unlocked: string[]; total: number }> {
  const existing = await prisma.viewerAchievement.findMany({
    where: { channelId, twitchUserId: userId },
    select: { achievementId: true },
  });
  return {
    unlocked: existing.map((a) => a.achievementId),
    total: ACHIEVEMENTS.length,
  };
}
