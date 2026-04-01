import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * V-Pet System
 *
 * Players buy a pet and equip items from a shop.
 * Pet sits visually on the casino page (bottom right).
 * Prices scale exponentially — infinite item tiers.
 */

// ── Pet Types ──
export const PET_CATALOG = [
  { id: "cat", name: "Katze", emoji: "🐱", price: 500, bonus: "flip_luck", bonusDesc: "+1% Flip-Glück/LVL", perLevel: 0.01 },
  { id: "dog", name: "Hund", emoji: "🐶", price: 1000, bonus: "shield", bonusDesc: "+1 Trostpreis/LVL", perLevel: 1 },
  { id: "bunny", name: "Hase", emoji: "🐰", price: 2500, bonus: "free_plays", bonusDesc: "+1 Free Play/3 LVL", perLevel: 0.333 },
  { id: "fox", name: "Fuchs", emoji: "🦊", price: 5000, bonus: "specials", bonusDesc: "+0.5% Special-Rate/LVL", perLevel: 0.005 },
  { id: "panda", name: "Panda", emoji: "🐼", price: 15000, bonus: "payout", bonusDesc: "+2% Payout/LVL", perLevel: 0.02 },
  { id: "dragon", name: "Drache", emoji: "🐉", price: 50000, bonus: "boss_dmg", bonusDesc: "+3% Boss-DMG/LVL", perLevel: 0.03 },
  { id: "unicorn", name: "Einhorn", emoji: "🦄", price: 150000, bonus: "slots_luck", bonusDesc: "+1% Slot-Glück/LVL", perLevel: 0.01 },
  { id: "phoenix", name: "Phoenix", emoji: "🔥", price: 500000, bonus: "scratch_luck", bonusDesc: "+1% Scratch-Glück/LVL", perLevel: 0.01 },
  { id: "alien", name: "Alien", emoji: "👾", price: 1500000, bonus: "mystery", bonusDesc: "+5% Mystery Reward/LVL", perLevel: 0.05 },
  { id: "robot", name: "Roboter", emoji: "🤖", price: 5000000, bonus: "xp", bonusDesc: "+3% XP/LVL", perLevel: 0.03 },
  { id: "kraken", name: "Kraken", emoji: "🦑", price: 15000000, bonus: "heist", bonusDesc: "+2% Heist-Pot/LVL", perLevel: 0.02 },
  { id: "void", name: "Void Entity", emoji: "🕳️", price: 50000000, bonus: "all", bonusDesc: "+1% auf ALLES/LVL", perLevel: 0.01 },
];

// ── Item Categories with tier-based pricing ──
// Each category has base items. Players can buy tier 1, 2, 3... of each.
// Price: basePrice * 2^tier. Higher tiers = shinier visual.
export const ITEM_CATEGORIES = [
  {
    category: "hat", name: "Hüte", emoji: "🎩",
    tiers: [
      { name: "Mütze", emoji: "🧢", basePrice: 200 },
      { name: "Zylinder", emoji: "🎩", basePrice: 1000 },
      { name: "Cowboyhut", emoji: "🤠", basePrice: 5000 },
      { name: "Krone", emoji: "👑", basePrice: 25000 },
      { name: "Heiligenschein", emoji: "😇", basePrice: 100000 },
      { name: "Dornenkrone", emoji: "⚜️", basePrice: 500000 },
    ],
  },
  {
    category: "glasses", name: "Brillen", emoji: "🕶️",
    tiers: [
      { name: "Sonnenbrille", emoji: "🕶️", basePrice: 200 },
      { name: "Nerdbrille", emoji: "🤓", basePrice: 1000 },
      { name: "Schutzbrille", emoji: "🥽", basePrice: 5000 },
      { name: "Monokel", emoji: "🧐", basePrice: 25000 },
      { name: "Laservisier", emoji: "🔴", basePrice: 200000 },
    ],
  },
  {
    category: "cape", name: "Umhänge", emoji: "🧣",
    tiers: [
      { name: "Schal", emoji: "🧣", basePrice: 300 },
      { name: "Umhang", emoji: "🦸", basePrice: 2000 },
      { name: "Flügel", emoji: "🪽", basePrice: 10000 },
      { name: "Flammenumhang", emoji: "🔥", basePrice: 75000 },
      { name: "Void-Mantel", emoji: "🌑", basePrice: 500000 },
    ],
  },
  {
    category: "weapon", name: "Accessoires", emoji: "⚔️",
    tiers: [
      { name: "Holzschwert", emoji: "🗡️", basePrice: 500 },
      { name: "Zauberstab", emoji: "🪄", basePrice: 3000 },
      { name: "Gitarre", emoji: "🎸", basePrice: 15000 },
      { name: "Diamantschwert", emoji: "💎", basePrice: 75000 },
      { name: "Dreizack", emoji: "🔱", basePrice: 500000 },
      { name: "Infinity-Klinge", emoji: "♾️", basePrice: 5000000 },
    ],
  },
  {
    category: "aura", name: "Auren", emoji: "✨",
    tiers: [
      { name: "Funkeln", emoji: "✨", basePrice: 1000 },
      { name: "Flamme", emoji: "🔥", basePrice: 10000 },
      { name: "Blitz", emoji: "⚡", basePrice: 50000 },
      { name: "Regenbogen", emoji: "🌈", basePrice: 250000 },
      { name: "Galaxie", emoji: "🌌", basePrice: 1000000 },
      { name: "Supernova", emoji: "💥", basePrice: 10000000 },
    ],
  },
  {
    category: "food", name: "Snacks", emoji: "🍕",
    tiers: [
      { name: "Keks", emoji: "🍪", basePrice: 100 },
      { name: "Pizza", emoji: "🍕", basePrice: 500 },
      { name: "Sushi", emoji: "🍣", basePrice: 2500 },
      { name: "Steak", emoji: "🥩", basePrice: 15000 },
      { name: "Goldener Apfel", emoji: "🍎", basePrice: 100000 },
    ],
  },
];

// ── Pet Data Structure ──
export interface OwnedPet {
  petId: string;
  petName: string;
  level: number;
  xp: number;
}

export interface PetCare {
  happiness: number;   // 0-100, decays -5/hour without walk
  hunger: number;      // 0-100, decays -8/hour without feed
  cleanliness: number; // 0-100, drops to 30 when poop appears
  lastFed: number;     // timestamp
  lastWalked: number;  // timestamp
  lastCleaned: number; // timestamp
  needsPoop: boolean;  // poop on screen after walk
  walkCount: number;   // total walks
  feedCount: number;   // total feeds
}

export interface PetData {
  activePetId: string;
  pets: OwnedPet[];
  equipped: {
    hat?: string;
    glasses?: string;
    cape?: string;
    weapon?: string;
    aura?: string;
    food?: string;
  };
  ownedItems: string[];
  totalSpent: number;
  care: PetCare;
}

function defaultCare(): PetCare {
  return {
    happiness: 100, hunger: 100, cleanliness: 100,
    lastFed: Date.now(), lastWalked: Date.now(), lastCleaned: Date.now(),
    needsPoop: false, walkCount: 0, feedCount: 0,
  };
}

/** Decay stats based on time elapsed */
function decayCare(care: PetCare): PetCare {
  const now = Date.now();
  const hoursSinceFed = (now - care.lastFed) / 3600000;
  const hoursSinceWalked = (now - care.lastWalked) / 3600000;

  care.hunger = Math.max(0, Math.round(100 - hoursSinceFed * 8));
  care.happiness = Math.max(0, Math.round(100 - hoursSinceWalked * 5));
  if (care.needsPoop) care.cleanliness = Math.min(care.cleanliness, 30);

  return care;
}

/** Get mood percentage (average of all 3 stats) — determines bonus effectiveness */
export function getMoodMultiplier(care: PetCare): number {
  const decayed = decayCare({ ...care });
  const avg = (decayed.happiness + decayed.hunger + decayed.cleanliness) / 300;
  return Math.max(0.1, avg); // min 10% effectiveness
}

/** Get the active pet from the collection */
function getActivePet(data: PetData): OwnedPet | undefined {
  return data.pets.find(p => p.petId === data.activePetId);
}

function petKey(channelId: string, userId: string): string {
  return `casino:pet:${channelId}:${userId}`;
}

export async function getPet(channelId: string, userId: string): Promise<PetData | null> {
  const raw = await redis.get(petKey(channelId, userId));
  if (!raw) return null;
  const data = JSON.parse(raw);

  // Migrate old format (single pet) to new format (collection)
  if (data.petId && !data.pets) {
    const migrated: PetData = {
      activePetId: data.petId,
      pets: [{ petId: data.petId, petName: data.petName ?? "Pet", level: data.level ?? 1, xp: data.xp ?? 0 }],
      equipped: data.equipped ?? {},
      ownedItems: data.ownedItems ?? [],
      totalSpent: data.totalSpent ?? 0,
      care: data.care ?? defaultCare(),
    };
    await redis.set(petKey(channelId, userId), JSON.stringify(migrated));
    return migrated;
  }

  // Ensure care exists
  if (!data.care) data.care = defaultCare();
  return data;
}

export async function buyPet(channelId: string, userId: string, petId: string, customName?: string): Promise<{ success: boolean; pet?: PetData; error?: string }> {
  const existing = await getPet(channelId, userId);
  if (existing?.pets.some(p => p.petId === petId)) {
    return { success: false, error: "Du hast dieses Pet bereits!" };
  }

  const petDef = PET_CATALOG.find(p => p.id === petId);
  if (!petDef) return { success: false, error: "Unbekanntes Pet!" };

  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < petDef.price) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${petDef.price.toLocaleString()}.` };
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: petDef.price } },
  });

  const newOwnedPet: OwnedPet = { petId, petName: customName || petDef.name, level: 1, xp: 0 };

  let data: PetData;
  if (existing) {
    existing.pets.push(newOwnedPet);
    existing.totalSpent += petDef.price;
    data = existing;
  } else {
    data = {
      activePetId: petId,
      pets: [newOwnedPet],
      equipped: {},
      ownedItems: [],
      totalSpent: petDef.price,
      care: defaultCare(),
    };
  }

  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { success: true, pet: data };
}

export function getItemPrice(basePrice: number, tier: number): number {
  // tier 0 = base, tier 1 = 2x, tier 2 = 4x, etc.
  return Math.floor(basePrice * Math.pow(2, tier));
}

export async function buyItem(
  channelId: string,
  userId: string,
  category: string,
  itemIndex: number,
): Promise<{ success: boolean; error?: string }> {
  const pet = await getPet(channelId, userId);
  if (!pet) return { success: false, error: "Du hast kein Pet! Kaufe zuerst eines." };

  const cat = ITEM_CATEGORIES.find(c => c.category === category);
  if (!cat) return { success: false, error: "Unbekannte Kategorie!" };
  if (itemIndex < 0 || itemIndex >= cat.tiers.length) return { success: false, error: "Unbekanntes Item!" };

  const itemDef = cat.tiers[itemIndex]!;
  const itemKey = `${category}:${itemIndex}`;

  // How many of this exact item does the player own? Each purchase is a "tier upgrade"
  const ownedCount = pet.ownedItems.filter(i => i === itemKey).length;
  const price = getItemPrice(itemDef.basePrice, ownedCount);

  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < price) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${price.toLocaleString()}.` };
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: price } },
  });

  pet.ownedItems.push(itemKey);
  pet.totalSpent += price;

  // Auto-equip if slot is empty
  if (!pet.equipped[category as keyof PetData["equipped"]]) {
    (pet.equipped as any)[category] = itemDef.emoji;
  }

  await redis.set(petKey(channelId, userId), JSON.stringify(pet));
  return { success: true };
}

export async function equipItem(
  channelId: string,
  userId: string,
  category: string,
  itemIndex: number,
): Promise<{ success: boolean; error?: string }> {
  const pet = await getPet(channelId, userId);
  if (!pet) return { success: false, error: "Kein Pet!" };

  const cat = ITEM_CATEGORIES.find(c => c.category === category);
  if (!cat || itemIndex < 0 || itemIndex >= cat.tiers.length) return { success: false, error: "Unbekanntes Item!" };

  const itemKey = `${category}:${itemIndex}`;
  if (!pet.ownedItems.includes(itemKey)) return { success: false, error: "Du besitzt dieses Item nicht!" };

  (pet.equipped as any)[category] = cat.tiers[itemIndex]!.emoji;
  await redis.set(petKey(channelId, userId), JSON.stringify(pet));
  return { success: true };
}

export async function unequipItem(
  channelId: string,
  userId: string,
  category: string,
): Promise<{ success: boolean }> {
  const pet = await getPet(channelId, userId);
  if (!pet) return { success: false };
  delete (pet.equipped as any)[category];
  await redis.set(petKey(channelId, userId), JSON.stringify(pet));
  return { success: true };
}

export async function renamePet(
  channelId: string,
  userId: string,
  newName: string,
): Promise<{ success: boolean }> {
  const data = await getPet(channelId, userId);
  if (!data) return { success: false };
  const active = data.pets.find(p => p.petId === data.activePetId);
  if (!active) return { success: false };
  active.petName = newName.slice(0, 20);
  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { success: true };
}

/** Add XP to active pet (called after each game) */
export async function addPetXp(channelId: string, userId: string, xp: number): Promise<{ levelUp: boolean; newLevel: number } | null> {
  const data = await getPet(channelId, userId);
  if (!data) return null;

  const active = data.pets.find(p => p.petId === data.activePetId);
  if (!active) return null;

  active.xp += xp;
  let levelUp = false;
  let xpNeeded = active.level * 50;
  while (active.xp >= xpNeeded && active.level < 999) {
    active.xp -= xpNeeded;
    active.level++;
    xpNeeded = active.level * 50;
    levelUp = true;
  }

  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { levelUp, newLevel: active.level };
}

/** Switch active pet */
export async function setActivePet(channelId: string, userId: string, petId: string): Promise<{ success: boolean; error?: string }> {
  const data = await getPet(channelId, userId);
  if (!data) return { success: false, error: "Keine Pets!" };
  if (!data.pets.some(p => p.petId === petId)) return { success: false, error: "Du besitzt dieses Pet nicht!" };
  data.activePetId = petId;
  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { success: true };
}

/** Walk the pet — increases happiness, 60% chance poop spawns */
export async function walkPet(channelId: string, userId: string): Promise<{
  success: boolean; poop?: boolean; happiness?: number; error?: string;
}> {
  const data = await getPet(channelId, userId);
  if (!data) return { success: false, error: "Kein Pet!" };
  if (!data.care) data.care = defaultCare();

  // Cooldown: 15 min
  if (Date.now() - data.care.lastWalked < 900000) {
    const mins = Math.ceil((900000 - (Date.now() - data.care.lastWalked)) / 60000);
    return { success: false, error: `Gassi Cooldown! Noch ${mins} Min.` };
  }

  data.care.lastWalked = Date.now();
  data.care.happiness = Math.min(100, data.care.happiness + 30);
  data.care.walkCount++;

  // 60% chance poop appears
  const poop = Math.random() < 0.6;
  if (poop) {
    data.care.needsPoop = true;
    data.care.cleanliness = Math.min(data.care.cleanliness, 30);
  }

  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { success: true, poop, happiness: data.care.happiness };
}

/** Clean up poop */
export async function cleanPoop(channelId: string, userId: string): Promise<{ success: boolean }> {
  const data = await getPet(channelId, userId);
  if (!data) return { success: false };
  if (!data.care) data.care = defaultCare();
  data.care.needsPoop = false;
  data.care.cleanliness = 100;
  data.care.lastCleaned = Date.now();
  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { success: true };
}

/** Feed the pet — uses equipped food item, restores hunger */
export async function feedPet(channelId: string, userId: string): Promise<{
  success: boolean; hunger?: number; error?: string;
}> {
  const data = await getPet(channelId, userId);
  if (!data) return { success: false, error: "Kein Pet!" };
  if (!data.care) data.care = defaultCare();

  // Cooldown: 10 min
  if (Date.now() - data.care.lastFed < 600000) {
    const mins = Math.ceil((600000 - (Date.now() - data.care.lastFed)) / 60000);
    return { success: false, error: `Fütter-Cooldown! Noch ${mins} Min.` };
  }

  data.care.lastFed = Date.now();
  data.care.hunger = Math.min(100, data.care.hunger + 40);
  data.care.feedCount++;

  await redis.set(petKey(channelId, userId), JSON.stringify(data));
  return { success: true, hunger: data.care.hunger };
}

/** Get current care state with decay applied */
export async function getCareState(channelId: string, userId: string): Promise<PetCare | null> {
  const data = await getPet(channelId, userId);
  if (!data?.care) return null;
  return decayCare({ ...data.care });
}

/** Get active pet's passive bonus values */
export async function getPetBonuses(channelId: string, userId: string): Promise<{
  flipLuck: number; slotsLuck: number; scratchLuck: number;
  payout: number; shield: number; freePlays: number;
  specials: number; bossDmg: number; xpBonus: number; heistBonus: number;
  mysteryBonus: number;
}> {
  const defaults = { flipLuck: 0, slotsLuck: 0, scratchLuck: 0, payout: 0, shield: 0, freePlays: 0, specials: 0, bossDmg: 0, xpBonus: 0, heistBonus: 0, mysteryBonus: 0 };
  const data = await getPet(channelId, userId);
  if (!data) return defaults;
  const active = data.pets.find(p => p.petId === data.activePetId);
  if (!active) return defaults;

  const def = PET_CATALOG.find(p => p.id === active.petId);
  if (!def) return defaults;

  const mood = data.care ? getMoodMultiplier(data.care) : 1;
  const lvl = active.level;
  const val = def.perLevel * lvl * mood; // mood reduces effectiveness

  switch (def.bonus) {
    case "flip_luck": return { ...defaults, flipLuck: val };
    case "shield": return { ...defaults, shield: Math.floor(val) };
    case "free_plays": return { ...defaults, freePlays: Math.floor(val) };
    case "specials": return { ...defaults, specials: val };
    case "payout": return { ...defaults, payout: val };
    case "boss_dmg": return { ...defaults, bossDmg: val };
    case "slots_luck": return { ...defaults, slotsLuck: val };
    case "scratch_luck": return { ...defaults, scratchLuck: val };
    case "mystery": return { ...defaults, mysteryBonus: val };
    case "xp": return { ...defaults, xpBonus: val };
    case "heist": return { ...defaults, heistBonus: val };
    case "all":
      return { flipLuck: val, slotsLuck: val, scratchLuck: val, payout: val, shield: Math.floor(val * 100), freePlays: 0, specials: val, bossDmg: val, xpBonus: val, heistBonus: val, mysteryBonus: val };
    default: return defaults;
  }
}

/** Get shop catalog with prices adjusted for what the player owns */
export async function getShop(channelId: string, userId: string) {
  const pet = await getPet(channelId, userId);
  const ownedItems = pet?.ownedItems ?? [];

  return {
    pets: PET_CATALOG.map(p => ({
      ...p,
      owned: pet?.pets.some(op => op.petId === p.id) ?? false,
      active: pet?.activePetId === p.id,
      level: pet?.pets.find(op => op.petId === p.id)?.level ?? 0,
    })),
    categories: ITEM_CATEGORIES.map(cat => ({
      ...cat,
      tiers: cat.tiers.map((item, idx) => {
        const itemKey = `${cat.category}:${idx}`;
        const ownedCount = ownedItems.filter(i => i === itemKey).length;
        const price = getItemPrice(item.basePrice, ownedCount);
        const equipped = pet?.equipped[cat.category as keyof PetData["equipped"]] === item.emoji;
        return { ...item, index: idx, price, ownedCount, equipped, owned: ownedCount > 0 };
      }),
    })),
  };
}
