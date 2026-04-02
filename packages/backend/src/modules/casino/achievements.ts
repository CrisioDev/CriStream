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
  category: "start" | "milestone" | "luck" | "pech" | "specials" | "double" | "social" | "grind" | "legendary" | "tier" | "dice" | "minigame" | "prestige" | "guild" | "economy" | "story";
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

  // ── TIER SLOTS (8) ──
  { id: "tier_first", name: "Tier-Slot Anfänger", description: "Spiele deinen ersten Tier-Slot", category: "tier", rarity: "common", reward: { points: 10 }, check: (s) => s.tierSlotsPlayed >= 1 },
  { id: "tier_10", name: "Tier-Slot Fan", description: "Spiele 10 Tier-Slots", category: "tier", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.tierSlotsPlayed >= 10 },
  { id: "tier_50", name: "Diamond Spieler", description: "Spiele 50 Tier-Slots", category: "tier", rarity: "rare", reward: { points: 75, title: "Diamond Spieler" }, check: (s) => s.tierSlotsPlayed >= 50 },
  { id: "tier_100", name: "Royal Gambler", description: "Spiele 100 Tier-Slots", category: "tier", rarity: "epic", reward: { points: 150, title: "Royal Gambler" }, check: (s) => s.tierSlotsPlayed >= 100 },
  { id: "tier_250", name: "Kosmischer Spieler", description: "Spiele 250 Tier-Slots", category: "tier", rarity: "epic", reward: { points: 200, title: "Kosmischer Spieler" }, check: (s) => s.tierSlotsPlayed >= 250 },
  { id: "tier_500", name: "Mythischer Spieler", description: "Spiele 500 Tier-Slots", category: "tier", rarity: "legendary", reward: { points: 400, title: "Mythischer Spieler" }, check: (s) => s.tierSlotsPlayed >= 500 },
  { id: "tier_triple", name: "Tier-Triple!", description: "Erziele einen Triple auf Tier-Slots", category: "tier", rarity: "rare", reward: { points: 50 }, check: (s) => s.triplesHit >= 1 && s.tierSlotsPlayed >= 1 },
  { id: "tier_jackpot", name: "Tier-Jackpot!", description: "Erziele 777 auf Tier-Slots", category: "tier", rarity: "legendary", reward: { points: 300, title: "Tier-Jackpot König" }, check: (s) => s.jackpots777 >= 1 && s.tierSlotsPlayed >= 1 },

  // ── DICE 21 (8) ──
  { id: "dice_first", name: "Würfelnovize", description: "Spiele dein erstes Dice 21", category: "dice", rarity: "common", reward: { points: 5 }, check: (s) => s.dice21Played >= 1 },
  { id: "dice_10", name: "Würfelveteran", description: "Spiele 10 Dice 21 Runden", category: "dice", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.dice21Played >= 10 },
  { id: "dice_25", name: "Würfelprofi", description: "Spiele 25 Dice 21 Runden", category: "dice", rarity: "rare", reward: { points: 50, title: "Würfelprofi" }, check: (s) => s.dice21Played >= 25 },
  { id: "dice_50", name: "Würfelmeister", description: "Spiele 50 Dice 21 Runden", category: "dice", rarity: "epic", reward: { points: 100, title: "Würfelmeister" }, check: (s) => s.dice21Played >= 50 },
  { id: "dice_win_5", name: "Gegen das Haus", description: "Schlage das Haus 5x bei Dice 21", category: "dice", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.dice21Won >= 5 },
  { id: "dice_win_20", name: "Hausbezwinger", description: "Schlage das Haus 20x bei Dice 21", category: "dice", rarity: "rare", reward: { points: 75, title: "Hausbezwinger" }, check: (s) => s.dice21Won >= 20 },
  { id: "dice_blackjack", name: "Blackjack!", description: "Triff exakt 21 bei Dice 21", category: "dice", rarity: "epic", reward: { points: 100, title: "Blackjack" }, check: (s) => s.dice21Won >= 1 && s.dice21Played >= 1 },
  { id: "dice_100", name: "Dice-Legende", description: "Spiele 100 Dice 21 Runden", category: "dice", rarity: "legendary", reward: { points: 200, title: "Dice-Legende" }, check: (s) => s.dice21Played >= 100 },

  // ── OVER/UNDER (5) ──
  { id: "overunder_first", name: "Glückstipp", description: "Spiele dein erstes Over/Under", category: "dice", rarity: "common", reward: { points: 5 }, check: (s) => s.overUnderPlayed >= 1 },
  { id: "overunder_10", name: "Tipp-Profi", description: "Spiele 10 Over/Under Runden", category: "dice", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.overUnderPlayed >= 10 },
  { id: "overunder_50", name: "Tipp-Meister", description: "Spiele 50 Over/Under Runden", category: "dice", rarity: "rare", reward: { points: 50, title: "Tipp-Meister" }, check: (s) => s.overUnderPlayed >= 50 },
  { id: "overunder_win_10", name: "Tipp-König", description: "Gewinne 10 Over/Under Runden", category: "dice", rarity: "uncommon", reward: { points: 30 }, check: (s) => s.overUnderWon >= 10 },
  { id: "overunder_win_25", name: "Orakel", description: "Gewinne 25 Over/Under Runden", category: "dice", rarity: "rare", reward: { points: 75, title: "Orakel" }, check: (s) => s.overUnderWon >= 25 },

  // ── MINIGAMES (6) ──
  { id: "minigame_first", name: "Mini-Spieler", description: "Spiele dein erstes Minigame", category: "minigame", rarity: "common", reward: { points: 5 }, check: (s) => s.minigamesPlayed >= 1 },
  { id: "minigame_10", name: "Minigame-Fan", description: "Spiele 10 Minigames", category: "minigame", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.minigamesPlayed >= 10 },
  { id: "minigame_25", name: "Minigame-Profi", description: "Spiele 25 Minigames", category: "minigame", rarity: "rare", reward: { points: 50, title: "Minigame-Profi" }, check: (s) => s.minigamesPlayed >= 25 },
  { id: "minigame_50", name: "Allrounder-Gamer", description: "Spiele 50 Minigames", category: "minigame", rarity: "epic", reward: { points: 100, title: "Allrounder" }, check: (s) => s.minigamesPlayed >= 50 },
  { id: "minigame_100", name: "Minigame-Legende", description: "Spiele 100 Minigames", category: "minigame", rarity: "legendary", reward: { points: 200, title: "Minigame-Legende" }, check: (s) => s.minigamesPlayed >= 100 },
  { id: "minigame_grinder", name: "Minigame-Grinder", description: "Spiele 250 Minigames", category: "minigame", rarity: "legendary", reward: { points: 400, title: "Minigame-Gott" }, check: (s) => s.minigamesPlayed >= 250 },

  // ── PRESTIGE (5) ──
  { id: "prestige_1", name: "Prestige I", description: "Erreiche Prestige-Stufe 1", category: "prestige", rarity: "uncommon", reward: { points: 50, title: "Prestige I" }, check: (s) => s.prestigeLevel >= 1 },
  { id: "prestige_3", name: "Prestige III", description: "Erreiche Prestige-Stufe 3", category: "prestige", rarity: "rare", reward: { points: 100, title: "Prestige III" }, check: (s) => s.prestigeLevel >= 3 },
  { id: "prestige_5", name: "Prestige V", description: "Erreiche Prestige-Stufe 5", category: "prestige", rarity: "epic", reward: { points: 200, title: "Prestige V" }, check: (s) => s.prestigeLevel >= 5 },
  { id: "prestige_10", name: "Prestige X", description: "Erreiche Prestige-Stufe 10", category: "prestige", rarity: "legendary", reward: { points: 500, title: "Prestige X" }, check: (s) => s.prestigeLevel >= 10 },
  { id: "prestige_max", name: "Maximum Prestige", description: "Erreiche Prestige-Stufe 15", category: "prestige", rarity: "legendary", reward: { points: 750, title: "Maximum Prestige" }, check: (s) => s.prestigeLevel >= 15 },

  // ── GUILD (4) ──
  { id: "guild_plays_50", name: "Gilden-Mitglied", description: "Spiele 50 Spiele als Gilden-Mitglied", category: "guild", rarity: "uncommon", reward: { points: 30, title: "Gilden-Mitglied" }, check: (s) => s.totalPlays >= 50 },
  { id: "guild_plays_200", name: "Gilden-Veteran", description: "Spiele 200 Spiele als aktiver Spieler", category: "guild", rarity: "rare", reward: { points: 75, title: "Gilden-Veteran" }, check: (s) => s.totalPlays >= 200 },
  { id: "guild_plays_500", name: "Gilden-Elite", description: "Spiele 500 Spiele — Gilden-Elite", category: "guild", rarity: "epic", reward: { points: 150, title: "Gilden-Elite" }, check: (s) => s.totalPlays >= 500 },
  { id: "guild_plays_1000", name: "Gilden-Legende", description: "Spiele 1000 Spiele — Gilden-Legende", category: "guild", rarity: "legendary", reward: { points: 300, title: "Gilden-Legende" }, check: (s) => s.totalPlays >= 1000 },

  // ── HEIST EXTENDED (6) ──
  { id: "heist_10", name: "Heist-Veteran", description: "Nimm an 10 Heists teil", category: "social", rarity: "rare", reward: { points: 50, title: "Heist-Veteran" }, check: (s) => s.heistsPlayed >= 10 },
  { id: "heist_25", name: "Heist-Meister", description: "Nimm an 25 Heists teil", category: "social", rarity: "epic", reward: { points: 100, title: "Heist-Meister" }, check: (s) => s.heistsPlayed >= 25 },
  { id: "heist_win_5", name: "Räuber-Bande", description: "Gewinne 5 Heists", category: "social", rarity: "rare", reward: { points: 75, title: "Räuber" }, check: (s) => s.heistsWon >= 5 },
  { id: "heist_win_10", name: "Meister-Dieb", description: "Gewinne 10 Heists", category: "social", rarity: "epic", reward: { points: 150, title: "Meister-Dieb" }, check: (s) => s.heistsWon >= 10 },
  { id: "heist_win_25", name: "Großer Fang", description: "Gewinne 25 Heists", category: "social", rarity: "legendary", reward: { points: 300, title: "Großer Fang" }, check: (s) => s.heistsWon >= 25 },
  { id: "heist_50", name: "Heist-Legende", description: "Nimm an 50 Heists teil", category: "social", rarity: "legendary", reward: { points: 250, title: "Heist-Legende" }, check: (s) => s.heistsPlayed >= 50 },

  // ── BREEDING (4) ──
  { id: "breed_first", name: "Züchter", description: "Züchte dein erstes Pet", category: "specials", rarity: "uncommon", reward: { points: 25 }, check: (s) => s.breedsDone >= 1 },
  { id: "breed_5", name: "Züchter-Meister", description: "Züchte 5 Pets", category: "specials", rarity: "rare", reward: { points: 75, title: "Züchter-Meister" }, check: (s) => s.breedsDone >= 5 },
  { id: "breed_10", name: "Zucht-Experte", description: "Züchte 10 Pets", category: "specials", rarity: "epic", reward: { points: 150, title: "Zucht-Experte" }, check: (s) => s.breedsDone >= 10 },
  { id: "breed_25", name: "Zucht-Legende", description: "Züchte 25 Pets", category: "specials", rarity: "legendary", reward: { points: 300, title: "Zucht-Legende" }, check: (s) => s.breedsDone >= 25 },

  // ── ECONOMY (8) ──
  { id: "won_50000", name: "Millionär", description: "Gewinne insgesamt 50.000 Punkte", category: "economy", rarity: "epic", reward: { points: 200, title: "Millionär" }, check: (s) => s.totalPointsWon >= 50000 },
  { id: "won_100000", name: "Multi-Millionär", description: "Gewinne insgesamt 100.000 Punkte", category: "economy", rarity: "legendary", reward: { points: 400, title: "Multi-Millionär" }, check: (s) => s.totalPointsWon >= 100000 },
  { id: "won_500000", name: "Hundert-Millionär", description: "Gewinne insgesamt 500.000 Punkte", category: "economy", rarity: "legendary", reward: { points: 750, title: "Hundert-Millionär" }, check: (s) => s.totalPointsWon >= 500000 },
  { id: "lost_10000", name: "Investor", description: "Verliere insgesamt 10.000 Punkte (investiert!)", category: "economy", rarity: "rare", reward: { points: 75 }, check: (s) => s.totalPointsLost >= 10000 },
  { id: "lost_50000", name: "Großinvestor", description: "Verliere insgesamt 50.000 Punkte", category: "economy", rarity: "epic", reward: { points: 150, title: "Großinvestor" }, check: (s) => s.totalPointsLost >= 50000 },
  { id: "allin_3", name: "Adrenalin-Junkie", description: "Spiele 3 All-Ins", category: "economy", rarity: "rare", reward: { points: 50, title: "Adrenalin-Junkie" }, check: (s) => s.allInsPlayed >= 3 },
  { id: "allin_10", name: "All-In Süchtiger", description: "Spiele 10 All-Ins", category: "economy", rarity: "epic", reward: { points: 125, title: "All-In Süchtiger" }, check: (s) => s.allInsPlayed >= 10 },
  { id: "allin_win_10", name: "Todesmutig", description: "Gewinne 10 All-Ins", category: "economy", rarity: "legendary", reward: { points: 300, title: "Todesmutig" }, check: (s) => s.allInsWon >= 10 },

  // ── STREAKS & MILESTONES EXTENDED (8) ──
  { id: "days_3", name: "Drei Tage", description: "Spiele an 3 verschiedenen Tagen", category: "milestone", rarity: "common", reward: { points: 15 }, check: (s) => s.daysPlayed >= 3 },
  { id: "days_60", name: "Zwei Monate", description: "Spiele an 60 verschiedenen Tagen", category: "milestone", rarity: "epic", reward: { points: 150, title: "Dauerspieler" }, check: (s) => s.daysPlayed >= 60 },
  { id: "days_100", name: "100 Tage", description: "Spiele an 100 verschiedenen Tagen", category: "milestone", rarity: "legendary", reward: { points: 300, title: "100-Tage-Veteran" }, check: (s) => s.daysPlayed >= 100 },
  { id: "plays_2000", name: "2000er Club", description: "Spiele 2000 Casino-Spiele", category: "milestone", rarity: "rare", reward: { points: 100, title: "2000er Club" }, check: (s) => s.totalPlays >= 2000 },
  { id: "plays_5000", name: "5000er Club", description: "Spiele 5000 Casino-Spiele", category: "milestone", rarity: "epic", reward: { points: 250, title: "5000er Club" }, check: (s) => s.totalPlays >= 5000 },
  { id: "plays_10000", name: "10K Club", description: "Spiele 10.000 Casino-Spiele", category: "milestone", rarity: "legendary", reward: { points: 500, title: "10K Club" }, check: (s) => s.totalPlays >= 10000 },
  { id: "loss_streak_15", name: "Eiserner Wille", description: "Überlebe eine 15er Pechsträhne", category: "pech", rarity: "rare", reward: { points: 50, title: "Eiserner Wille" }, check: (s) => s.maxLossStreak >= 15 },
  { id: "loss_streak_30", name: "Unzerbrechlich", description: "Überlebe eine 30er Pechsträhne", category: "pech", rarity: "legendary", reward: { points: 200, title: "Unzerbrechlich" }, check: (s) => s.maxLossStreak >= 30 },

  // ── QUEST EXTENDED (3) ──
  { id: "quests_10", name: "Quest-Sammler", description: "Schließe 10 tägliche Quests ab", category: "grind", rarity: "common", reward: { points: 20 }, check: (s) => s.questsCompleted >= 10 },
  { id: "quests_50", name: "Quest-Veteran", description: "Schließe 50 tägliche Quests ab", category: "grind", rarity: "rare", reward: { points: 75, title: "Quest-Veteran" }, check: (s) => s.questsCompleted >= 50 },
  { id: "quests_200", name: "Quest-Gott", description: "Schließe 200 tägliche Quests ab", category: "grind", rarity: "legendary", reward: { points: 400, title: "Quest-Gott" }, check: (s) => s.questsCompleted >= 200 },

  // ── SPECIAL EXTENDED (4) ──
  { id: "specials_50", name: "Special-Sammler", description: "Löse 50 Specials aus", category: "legendary", rarity: "rare", reward: { points: 75, title: "Special-Sammler" }, check: (s) => s.specialsTriggered >= 50 },
  { id: "mystery_25", name: "Mystery-Jäger", description: "Öffne 25 Mystery Boxen", category: "specials", rarity: "epic", reward: { points: 100, title: "Mystery-Jäger" }, check: (s) => s.mysteryBoxes >= 25 },
  { id: "mystery_50", name: "Mystery-Legende", description: "Öffne 50 Mystery Boxen", category: "specials", rarity: "legendary", reward: { points: 200, title: "Mystery-Legende" }, check: (s) => s.mysteryBoxes >= 50 },
  { id: "boss_10", name: "Boss-Vernichter", description: "Besiege 10 Bosse", category: "specials", rarity: "legendary", reward: { points: 250, title: "Boss-Vernichter" }, check: (s) => s.bossesKilled >= 10 },

  // ── FLIP EXTENDED (3) ──
  { id: "flip_250", name: "Flip-Gott", description: "Gewinne 250 Flips", category: "luck", rarity: "epic", reward: { points: 125, title: "Flip-Gott" }, check: (s) => s.flipWon >= 250 },
  { id: "flip_500", name: "Flip-Legende", description: "Gewinne 500 Flips", category: "luck", rarity: "legendary", reward: { points: 300, title: "Flip-Legende" }, check: (s) => s.flipWon >= 500 },
  { id: "flip_played_1000", name: "Münz-Süchtiger", description: "Spiele 1000 Flips", category: "luck", rarity: "legendary", reward: { points: 250, title: "Münz-Süchtiger" }, check: (s) => s.flipPlayed >= 1000 },

  // ── SLOTS EXTENDED (3) ──
  { id: "slot_100", name: "Slot-König", description: "Gewinne 100 Slots", category: "luck", rarity: "epic", reward: { points: 125, title: "Slot-König" }, check: (s) => s.slotsWon >= 100 },
  { id: "slot_250", name: "Slot-Legende", description: "Gewinne 250 Slots", category: "luck", rarity: "legendary", reward: { points: 300, title: "Slot-Legende" }, check: (s) => s.slotsWon >= 250 },
  { id: "slot_played_500", name: "Slot-Süchtiger", description: "Spiele 500 Slots", category: "luck", rarity: "legendary", reward: { points: 250, title: "Slot-Süchtiger" }, check: (s) => s.slotsPlayed >= 500 },

  // ── SCRATCH EXTENDED (2) ──
  { id: "scratch_100", name: "Rubbellos-König", description: "Gewinne 100 Rubbellose", category: "luck", rarity: "epic", reward: { points: 125, title: "Rubbellos-König" }, check: (s) => s.scratchWon >= 100 },
  { id: "scratch_played_500", name: "Kratz-Süchtiger", description: "Spiele 500 Rubbellose", category: "luck", rarity: "legendary", reward: { points: 250, title: "Kratz-Süchtiger" }, check: (s) => s.scratchPlayed >= 500 },

  // ── DOUBLE EXTENDED (3) ──
  { id: "double_50", name: "Double-König", description: "Gewinne 50 Double-or-Nothing", category: "double", rarity: "epic", reward: { points: 100, title: "Double-König" }, check: (s) => s.doublesWon >= 50 },
  { id: "double_100", name: "Double-Legende", description: "Gewinne 100 Double-or-Nothing", category: "double", rarity: "legendary", reward: { points: 250, title: "Double-Legende" }, check: (s) => s.doublesWon >= 100 },
  { id: "double_big_2000", name: "Riesen-Double", description: "Gewinne 2000+ Punkte in einem Double", category: "double", rarity: "legendary", reward: { points: 200, title: "Riesen-Double" }, check: (s) => s.maxDoubleAmount >= 2000 },

  // ── GLUECKSRAD EXTENDED (2) ──
  { id: "gluecksrad_50", name: "Glücksrad-Meister", description: "Drehe 50x das Glücksrad", category: "specials", rarity: "epic", reward: { points: 100, title: "Glücksrad-Meister" }, check: (s) => s.gluecksradSpins >= 50 },
  { id: "gluecksrad_100", name: "Glücksrad-Legende", description: "Drehe 100x das Glücksrad", category: "specials", rarity: "legendary", reward: { points: 250, title: "Glücksrad-Legende" }, check: (s) => s.gluecksradSpins >= 100 },

  // ── SOCIAL EXTENDED (3) ──
  { id: "gifts_25", name: "Geschenke-König", description: "Löse 25 Geschenke an Chat aus", category: "social", rarity: "epic", reward: { points: 150, title: "Geschenke-König" }, check: (s) => s.giftsTriggered >= 25 },
  { id: "mitleid_10", name: "Mitleids-Magnet", description: "Erhalte 10x Mitleids-Punkte", category: "pech", rarity: "uncommon", reward: { points: 20, title: "Mitleids-Magnet" }, check: (s) => s.mitleidReceived >= 10 },
  { id: "mitleid_25", name: "Dauerbedauert", description: "Erhalte 25x Mitleids-Punkte", category: "pech", rarity: "rare", reward: { points: 50, title: "Dauerbedauert" }, check: (s) => s.mitleidReceived >= 25 },

  // ── STORY (5) ──
  { id: "story_king", name: "👑 Der König", description: "Beende die Story mit Ending: Der König", category: "story", rarity: "epic", reward: { points: 500, title: "Der König" }, check: (s) => s.storyEndingKing >= 1 },
  { id: "story_free", name: "✨ Die Freie Seele", description: "Beende die Story mit Ending: Die Freie Seele", category: "story", rarity: "epic", reward: { points: 500, title: "Die Freie Seele" }, check: (s) => s.storyEndingFree >= 1 },
  { id: "story_sacrifice", name: "🙏 Das Opfer", description: "Beende die Story mit Ending: Das Opfer", category: "story", rarity: "epic", reward: { points: 500, title: "Das Opfer" }, check: (s) => s.storyEndingSacrifice >= 1 },
  { id: "story_eternal", name: "🤝 Der Ewige Spieler", description: "Beende die Story mit Ending: Der Ewige Spieler", category: "story", rarity: "epic", reward: { points: 500, title: "Der Ewige Spieler" }, check: (s) => s.storyEndingEternal >= 1 },
  { id: "story_all", name: "📖 Legendensammler", description: "Erlebe alle 4 Story-Enden", category: "story", rarity: "legendary", reward: { points: 2000, title: "Legendensammler" }, check: (s) => s.storyEndingKing >= 1 && s.storyEndingFree >= 1 && s.storyEndingSacrifice >= 1 && s.storyEndingEternal >= 1 },
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
