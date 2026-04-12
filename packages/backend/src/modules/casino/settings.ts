import { redis } from "../../lib/redis.js";

/**
 * Casino Feature Toggles
 *
 * Redis hash per channel — each feature is "1" (on) or "0" (off).
 * All features default to enabled if no setting exists.
 */

export interface CasinoFeatureSettings {
  casino: boolean;          // master toggle — disables entire casino page
  gambling: boolean;        // flip, slots, scratch, all-in, tier slots, wheel
  minigames: boolean;       // snake, connect4, memory, sudoku, roulette, poker, dice21, overunder
  casinoRun: boolean;       // endless roguelike run
  pets: boolean;            // pet system, breeding, battles
  story: boolean;           // visual novel story mode
  social: boolean;          // guilds, heist, guild war
  progression: boolean;     // quests, achievements, battle pass, skill tree, tournaments
  dailyChallenge: boolean;  // community daily challenge
  jackpot: boolean;         // progressive jackpot
  luckyHour: boolean;       // random lucky hour events
  music: boolean;           // adaptive music toggle visible
}

const FEATURES: (keyof CasinoFeatureSettings)[] = [
  "casino", "gambling", "minigames", "casinoRun", "pets", "story",
  "social", "progression", "dailyChallenge", "jackpot", "luckyHour", "music",
];

function settingsKey(channelId: string): string {
  return `casino:settings:${channelId}`;
}

/** Get all feature settings for a channel. Defaults to all enabled. */
export async function getCasinoSettings(channelId: string): Promise<CasinoFeatureSettings> {
  const raw = await redis.hgetall(settingsKey(channelId));
  const settings: any = {};
  for (const f of FEATURES) {
    settings[f] = raw[f] === "0" ? false : true; // default = enabled
  }
  return settings as CasinoFeatureSettings;
}

/** Update one or more feature settings. */
export async function updateCasinoSettings(
  channelId: string,
  updates: Partial<CasinoFeatureSettings>,
): Promise<CasinoFeatureSettings> {
  const key = settingsKey(channelId);
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (FEATURES.includes(k as any)) {
      fields[k] = v ? "1" : "0";
    }
  }
  if (Object.keys(fields).length > 0) {
    await redis.hmset(key, fields);
  }
  return getCasinoSettings(channelId);
}

/** Check if a specific feature is enabled. */
export async function isFeatureEnabled(channelId: string, feature: keyof CasinoFeatureSettings): Promise<boolean> {
  const val = await redis.hget(settingsKey(channelId), feature);
  return val !== "0"; // default = enabled
}
