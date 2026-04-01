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
const PET_BONUSES: Record<string, { bonus: string; perLevel: number }> = {
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

  // Check pet ownership
  const petRaw = await redis.get(petKey(channelId, userId));
  if (!petRaw) return { success: false, error: "Du hast keine Pets!" };

  const petData = JSON.parse(petRaw);
  if (!petData.pets?.length) return { success: false, error: "Du hast keine Pets!" };

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

  // Create hybrid pet
  const bonus1 = PET_BONUSES[pet1Id] ?? { bonus: "all", perLevel: 0.01 };
  const bonus2 = PET_BONUSES[pet2Id] ?? { bonus: "all", perLevel: 0.01 };

  // Use parent1's bonus type (or "all" if mixed)
  const bonus = bonus1.bonus === bonus2.bonus ? bonus1.bonus : "all";
  const perLevel = +((bonus1.perLevel + bonus2.perLevel) / 2 * 1.1).toFixed(4); // avg * 1.1

  const prefix = NAME_PREFIXES[pet1Id] ?? pet1.petName.split("-")[0] ?? "Hybrid";
  const suffix = pet2.petName;
  const petName = `${prefix}-${suffix}`;

  const emoji1 = PET_EMOJIS[pet1Id] ?? "🥚";
  const emoji2 = PET_EMOJIS[pet2Id] ?? "🥚";
  // Take first emoji char(s) from each parent
  const emoji = `${emoji1.slice(0, 2)}${emoji2.slice(0, 2)}`;

  const newPetId = `bred_${pet1Id}_${pet2Id}_${Date.now().toString(36)}`;

  // Add to collection
  petData.pets.push({
    petId: newPetId,
    petName,
    level: 1,
    xp: 0,
  });
  await redis.set(petKey(channelId, userId), JSON.stringify(petData));

  // Update breed data
  breedData.lastBreed = Date.now();
  breedData.breedCount++;
  await redis.set(breedKey(channelId, userId), JSON.stringify(breedData));

  // Also register the new pet's bonuses for future breeding
  PET_BONUSES[newPetId] = { bonus, perLevel };
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

  const cooldownLeft = Math.max(0, data.lastBreed + COOLDOWN_MS - Date.now());

  return {
    breedCount: data.breedCount,
    nextCost: 10000 * (data.breedCount + 1),
    cooldownLeft,
  };
}
