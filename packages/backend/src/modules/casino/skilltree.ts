import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Skill Tree System
 *
 * Branches:
 * - luck_flip, luck_slots, luck_scratch: +0.5% win chance per level (per game)
 * - profit: +2% payout multiplier per level
 * - shield: +1 consolation bonus per level
 * - speed: -3% cooldown per level, +1 free play every 5 levels
 * - specials: +0.5% special trigger rate per level
 * - combat: +5% boss damage per level, +3% heist pot per level
 *
 * Cost: 50 * 2^level (exponential)
 */

export interface SkillLevels {
  luck_flip: number;
  luck_slots: number;
  luck_scratch: number;
  profit: number;
  shield: number;
  speed: number;
  specials: number;
  combat: number;
}

const DEFAULT_SKILLS: SkillLevels = {
  luck_flip: 0,
  luck_slots: 0,
  luck_scratch: 0,
  profit: 0,
  shield: 0,
  speed: 0,
  specials: 0,
  combat: 0,
};

export const SKILL_INFO: Record<keyof SkillLevels, { name: string; emoji: string; description: string; perLevel: string }> = {
  luck_flip: { name: "Münzglück", emoji: "🪙", description: "Erhöht Flip-Gewinnchance", perLevel: "+0.5% Win" },
  luck_slots: { name: "Slot-Glück", emoji: "🎰", description: "Erhöht Slot-Gewinnchance", perLevel: "+0.5% Win" },
  luck_scratch: { name: "Rubbelglück", emoji: "🎟️", description: "Erhöht Rubbellos-Gewinnchance", perLevel: "+0.5% Win" },
  profit: { name: "Profit", emoji: "💰", description: "Erhöht alle Auszahlungen", perLevel: "+2% Payout" },
  shield: { name: "Schutz", emoji: "🛡️", description: "Erhöht Trostpreise", perLevel: "+1 Trostpreis" },
  speed: { name: "Tempo", emoji: "⚡", description: "Mehr Gratis-Spins", perLevel: "+1 Free Play /5 LVL" },
  specials: { name: "Specials", emoji: "🌟", description: "Mehr Special-Events", perLevel: "+0.5% Trigger" },
  combat: { name: "Kampf", emoji: "⚔️", description: "Mehr Boss-Schaden & Heist-Bonus", perLevel: "+5% Damage" },
};

function skillKey(channelId: string, userId: string): string {
  return `casino:skills:${channelId}:${userId}`;
}

export function getSkillCost(currentLevel: number): number {
  return Math.floor(50 * Math.pow(2, currentLevel));
}

export function getTotalInvested(levels: SkillLevels): number {
  let total = 0;
  for (const key of Object.keys(levels) as (keyof SkillLevels)[]) {
    for (let i = 0; i < levels[key]; i++) {
      total += getSkillCost(i);
    }
  }
  return total;
}

export async function getSkills(channelId: string, userId: string): Promise<SkillLevels> {
  const raw = await redis.get(skillKey(channelId, userId));
  if (!raw) return { ...DEFAULT_SKILLS };
  return { ...DEFAULT_SKILLS, ...JSON.parse(raw) };
}

export async function upgradeSkill(
  channelId: string,
  userId: string,
  skill: keyof SkillLevels,
): Promise<{ success: boolean; newLevel?: number; cost?: number; error?: string }> {
  if (!(skill in DEFAULT_SKILLS)) return { success: false, error: "Unbekannter Skill!" };

  const skills = await getSkills(channelId, userId);
  const currentLevel = skills[skill];
  const cost = getSkillCost(currentLevel);

  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < cost) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${cost.toLocaleString()}.` };
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: cost } },
  });

  skills[skill] = currentLevel + 1;
  await redis.set(skillKey(channelId, userId), JSON.stringify(skills));

  return { success: true, newLevel: currentLevel + 1, cost };
}

// ── Gameplay modifiers ──

/** Get bonus win chance for a specific game (0.005 per level) */
export function getLuckBonus(skills: SkillLevels, game: "flip" | "slots" | "scratch"): number {
  const key = `luck_${game}` as keyof SkillLevels;
  return skills[key] * 0.005;
}

/** Get payout multiplier (1.0 + 0.02 per profit level) */
export function getPayoutMultiplier(skills: SkillLevels): number {
  return 1.0 + skills.profit * 0.02;
}

/** Get consolation bonus (shield level) */
export function getShieldBonus(skills: SkillLevels): number {
  return skills.shield;
}

/** Get extra free plays (1 per 5 speed levels) */
export function getExtraFreePlays(skills: SkillLevels): number {
  return Math.floor(skills.speed / 5);
}

/** Get special trigger rate bonus (0.005 per level) */
export function getSpecialBonus(skills: SkillLevels): number {
  return skills.specials * 0.005;
}

/** Get boss damage multiplier (1.0 + 0.05 per combat level) */
export function getCombatMultiplier(skills: SkillLevels): number {
  return 1.0 + skills.combat * 0.05;
}

/** Get heist pot bonus multiplier (1.0 + 0.03 per combat level) */
export function getHeistBonus(skills: SkillLevels): number {
  return 1.0 + skills.combat * 0.03;
}

/** Get full skill summary for API response */
export async function getSkillSummary(channelId: string, userId: string) {
  const skills = await getSkills(channelId, userId);
  const totalInvested = getTotalInvested(skills);
  const totalLevel = Object.values(skills).reduce((a, b) => a + b, 0);

  const details = (Object.keys(SKILL_INFO) as (keyof SkillLevels)[]).map(key => ({
    id: key,
    ...SKILL_INFO[key],
    level: skills[key],
    nextCost: getSkillCost(skills[key]),
    effect: getEffectText(key, skills[key]),
  }));

  return { skills, details, totalLevel, totalInvested };
}

function getEffectText(skill: keyof SkillLevels, level: number): string {
  if (level === 0) return "Kein Effekt";
  switch (skill) {
    case "luck_flip": return `+${(level * 0.5).toFixed(1)}% Flip-Chance`;
    case "luck_slots": return `+${(level * 0.5).toFixed(1)}% Slot-Chance`;
    case "luck_scratch": return `+${(level * 0.5).toFixed(1)}% Scratch-Chance`;
    case "profit": return `x${(1 + level * 0.02).toFixed(2)} Auszahlung`;
    case "shield": return `+${level} Trostpreis`;
    case "speed": return `+${Math.floor(level / 5)} Gratis-Spins`;
    case "specials": return `+${(level * 0.5).toFixed(1)}% Special-Rate`;
    case "combat": return `+${level * 5}% Boss-DMG`;
    default: return "";
  }
}
