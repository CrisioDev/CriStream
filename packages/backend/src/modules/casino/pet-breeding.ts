import { redis } from "../../lib/redis.js";

/**
 * Pet Breeding
 *
 * Combine two owned pets to create a hybrid with averaged bonuses + 10% bonus.
 * Cost scales exponentially. 24-hour cooldown between breeds.
 */

interface BreedData {
  lastBreed: number;
  breedCount: number;
}

// Pet name prefixes for breeding (first part of parent1's name)
const NAME_PREFIXES: Record<string, string> = {
  cat: "Katzen", dog: "Hunde", bunny: "Hasen", fox: "Fuchs",
  panda: "Panda", dragon: "Drachen", unicorn: "Einhorn", phoenix: "Phoenix",
  alien: "Alien", robot: "Robo", kraken: "Kraken", void: "Void",
  ghost_cat: "Geister", golden_dragon: "Gold", crystal_wolf: "Kristall",
  shadow_phoenix: "Schatten", cosmic_bunny: "Kosmo",
};

// Pet bonus definitions (merged from pets.ts and lootbox-pets.ts)
// Bred pets can have multiple bonuses via the bonuses[] array
const PET_BONUSES: Record<string, { bonus: string; perLevel: number; bonuses?: { bonus: string; perLevel: number }[] }> = {
  cat: { bonus: "flip_luck", perLevel: 0.01 },
  dog: { bonus: "shield", perLevel: 1 },
  bunny: { bonus: "free_plays", perLevel: 0.333 },
  fox: { bonus: "specials", perLevel: 0.005 },
  panda: { bonus: "payout", perLevel: 0.02 },
  dragon: { bonus: "boss_dmg", perLevel: 0.03 },
  unicorn: { bonus: "slots_luck", perLevel: 0.01 },
  phoenix: { bonus: "scratch_luck", perLevel: 0.01 },
  alien: { bonus: "mystery", perLevel: 0.05 },
  robot: { bonus: "xp", perLevel: 0.03 },
  kraken: { bonus: "heist", perLevel: 0.02 },
  void: { bonus: "all", perLevel: 0.01 },
  ghost_cat: { bonus: "all", perLevel: 0.015 },
  golden_dragon: { bonus: "payout", perLevel: 0.04 },
  crystal_wolf: { bonus: "boss_dmg", perLevel: 0.06 },
  shadow_phoenix: { bonus: "specials", perLevel: 0.02 },
  cosmic_bunny: { bonus: "xp", perLevel: 0.05 },
};

// Pet emojis for combining
const PET_EMOJIS: Record<string, string> = {
  cat: "🐱", dog: "🐶", bunny: "🐰", fox: "🦊", panda: "🐼",
  dragon: "🐉", unicorn: "🦄", phoenix: "🔥", alien: "👾",
  robot: "🤖", kraken: "🦑", void: "🕳️",
  ghost_cat: "👻🐱", golden_dragon: "✨🐉", crystal_wolf: "💎🐺",
  shadow_phoenix: "🌑🔥", cosmic_bunny: "🌌🐰",
};

function breedKey(channelId: string, userId: string): string {
  return `casino:breed:${channelId}:${userId}`;
}

function petKey(channelId: string, userId: string): string {
  return `casino:pet:${channelId}:${userId}`;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Breed two owned pets into a new hybrid */
export async function breedPets(
  channelId: string, userId: string, pet1Id: string, pet2Id: string,
): Promise<{
  success: boolean;
  newPet?: { petId: string; petName: string; emoji: string; bonus: string; perLevel: number };
  error?: string;
  cost?: number;
}> {
  if (pet1Id === pet2Id) return { success: false, error: "Du kannst nicht dasselbe Pet mit sich selbst züchten!" };

  // DEFENSIVE: reject pet IDs longer than 60 chars (exploit prevention)
  if (pet1Id.length > 60 || pet2Id.length > 60) return { success: false, error: "Ungültige Pet-ID!" };

  // Rate limit: max 1 breed per 10 seconds
  const rateLimitKey = `casino:breed:rl:${channelId}:${userId}`;
  const rl = await redis.get(rateLimitKey);
  if (rl) return { success: false, error: "Warte 10 Sekunden zwischen Zuchten!" };
  await redis.set(rateLimitKey, "1", "EX", 10);

  // Max pets limit: prevent collection bloat
  const petRaw = await redis.get(petKey(channelId, userId));
  if (!petRaw) return { success: false, error: "Du hast keine Pets!" };
  const petData = JSON.parse(petRaw);
  if (!petData.pets?.length) return { success: false, error: "Du hast keine Pets!" };
  if (petData.pets.length >= 50) return { success: false, error: "Max 50 Pets! Zu viele Pets." };

  const pet1 = petData.pets.find((p: any) => p.petId === pet1Id);
  const pet2 = petData.pets.find((p: any) => p.petId === pet2Id);
  if (!pet1) return { success: false, error: `Pet "${pet1Id}" nicht gefunden!` };
  if (!pet2) return { success: false, error: `Pet "${pet2Id}" nicht gefunden!` };

  // Check breed cooldown and count
  const breedRaw = await redis.get(breedKey(channelId, userId));
  const breedData: BreedData = breedRaw
    ? JSON.parse(breedRaw)
    : { lastBreed: 0, breedCount: 0 };

  // No cooldown — breed anytime

  // Calculate cost
  const cost = 10000 * (breedData.breedCount + 1);

  // Check points via pet data is not possible — we need channelUser
  // Import prisma for points check
  const { prisma } = await import("../../lib/prisma.js");
  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < cost) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${cost.toLocaleString()}.`, cost };
  }

  // Deduct cost
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: cost } },
  });

  // Create hybrid pet — COMBINES both parent bonuses with 10% breed bonus
  const bonus1 = PET_BONUSES[pet1Id] ?? { bonus: "all", perLevel: 0.01 };
  const bonus2 = PET_BONUSES[pet2Id] ?? { bonus: "all", perLevel: 0.01 };

  // Collect all bonuses from both parents (including inherited multi-bonuses from previous breeds)
  const parentBonuses1 = bonus1.bonuses ?? [{ bonus: bonus1.bonus, perLevel: bonus1.perLevel }];
  const parentBonuses2 = bonus2.bonuses ?? [{ bonus: bonus2.bonus, perLevel: bonus2.perLevel }];

  // Merge: if same bonus type, add perLevel values; if different, keep both
  const mergedMap = new Map<string, number>();
  for (const b of parentBonuses1) mergedMap.set(b.bonus, (mergedMap.get(b.bonus) ?? 0) + b.perLevel * 1.1);
  for (const b of parentBonuses2) mergedMap.set(b.bonus, (mergedMap.get(b.bonus) ?? 0) + b.perLevel * 1.1);

  const combinedBonuses = Array.from(mergedMap.entries()).map(([bonus, perLevel]) => ({
    bonus, perLevel: +perLevel.toFixed(4),
  }));

  // Primary display bonus = strongest one
  const strongest = combinedBonuses.sort((a, b) => b.perLevel - a.perLevel)[0]!;
  const bonus = strongest.bonus;
  const perLevel = strongest.perLevel;

  // Cap: max 8 bonus types, each capped at perLevel 0.1
  const cappedBonuses = combinedBonuses.slice(0, 8).map(b => ({
    bonus: b.bonus,
    perLevel: Math.min(b.perLevel, 0.1),
  }));

  const prefix = NAME_PREFIXES[pet1Id] ?? pet1.petName.split("-")[0]?.slice(0, 10) ?? "Hybrid";
  const suffix = pet2.petName.slice(0, 10);
  const petName = `${prefix}-${suffix}`;

  // Short emoji: max 4 chars
  const baseEmojis = ["🐱","🐶","🐰","🦊","🐼","🐉","🦄","🔥","👾","🤖","🦑","👻","✨","💎","🌑","🌌"];
  const emoji1 = PET_EMOJIS[pet1Id]?.slice(0, 2) ?? baseEmojis[Math.floor(Math.random() * baseEmojis.length)]!;
  const emoji2 = PET_EMOJIS[pet2Id]?.slice(0, 2) ?? baseEmojis[Math.floor(Math.random() * baseEmojis.length)]!;
  const emoji = `${emoji1}${emoji2}`;

  // Short ID: hash instead of concatenating parent IDs
  const newPetId = `bred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  // Add to collection (store bonuses on pet for persistence across restarts)
  petData.pets.push({
    petId: newPetId,
    petName,
    level: 1,
    xp: 0,
    bredBonuses: cappedBonuses, // stored on pet, capped to prevent exploit
  } as any);
  await redis.set(petKey(channelId, userId), JSON.stringify(petData));

  // Update breed data
  breedData.lastBreed = Date.now();
  breedData.breedCount++;
  await redis.set(breedKey(channelId, userId), JSON.stringify(breedData));

  // Also register the new pet's bonuses for future breeding (carries all combined bonuses)
  PET_BONUSES[newPetId] = { bonus, perLevel: Math.min(perLevel, 0.1), bonuses: cappedBonuses };
  PET_EMOJIS[newPetId] = emoji;

  return {
    success: true,
    newPet: { petId: newPetId, petName, emoji, bonus, perLevel },
    cost,
  };
}

/** Get breeding info for a user */
export async function getBreedInfo(channelId: string, userId: string): Promise<{
  breedCount: number; nextCost: number; cooldownLeft: number;
}> {
  const raw = await redis.get(breedKey(channelId, userId));
  const data: BreedData = raw
    ? JSON.parse(raw)
    : { lastBreed: 0, breedCount: 0 };

  return {
    breedCount: data.breedCount,
    nextCost: 10000 * (data.breedCount + 1),
    cooldownLeft: 0,
  };
}
