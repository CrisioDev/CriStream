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
  { id: "cat", name: "Katze", emoji: "🐱", price: 500 },
  { id: "dog", name: "Hund", emoji: "🐶", price: 1000 },
  { id: "bunny", name: "Hase", emoji: "🐰", price: 2500 },
  { id: "fox", name: "Fuchs", emoji: "🦊", price: 5000 },
  { id: "panda", name: "Panda", emoji: "🐼", price: 15000 },
  { id: "dragon", name: "Drache", emoji: "🐉", price: 50000 },
  { id: "unicorn", name: "Einhorn", emoji: "🦄", price: 150000 },
  { id: "phoenix", name: "Phoenix", emoji: "🔥", price: 500000 },
  { id: "alien", name: "Alien", emoji: "👾", price: 1500000 },
  { id: "robot", name: "Roboter", emoji: "🤖", price: 5000000 },
  { id: "kraken", name: "Kraken", emoji: "🦑", price: 15000000 },
  { id: "void", name: "Void Entity", emoji: "🕳️", price: 50000000 },
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
export interface PetData {
  petId: string;
  petName: string;
  level: number;
  xp: number;
  equipped: {
    hat?: string;    // item emoji
    glasses?: string;
    cape?: string;
    weapon?: string;
    aura?: string;
    food?: string;
  };
  ownedItems: string[]; // list of "category:tierIndex" keys
  totalSpent: number;
}

function petKey(channelId: string, userId: string): string {
  return `casino:pet:${channelId}:${userId}`;
}

export async function getPet(channelId: string, userId: string): Promise<PetData | null> {
  const raw = await redis.get(petKey(channelId, userId));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function buyPet(channelId: string, userId: string, petId: string, customName?: string): Promise<{ success: boolean; pet?: PetData; error?: string }> {
  const existing = await getPet(channelId, userId);
  if (existing) return { success: false, error: "Du hast bereits ein Pet!" };

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

  const pet: PetData = {
    petId,
    petName: customName || petDef.name,
    level: 1,
    xp: 0,
    equipped: {},
    ownedItems: [],
    totalSpent: petDef.price,
  };

  await redis.set(petKey(channelId, userId), JSON.stringify(pet));
  return { success: true, pet };
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
  const pet = await getPet(channelId, userId);
  if (!pet) return { success: false };
  pet.petName = newName.slice(0, 20);
  await redis.set(petKey(channelId, userId), JSON.stringify(pet));
  return { success: true };
}

/** Add XP to pet (called after each game) */
export async function addPetXp(channelId: string, userId: string, xp: number): Promise<{ levelUp: boolean; newLevel: number } | null> {
  const pet = await getPet(channelId, userId);
  if (!pet) return null;

  pet.xp += xp;
  const xpNeeded = pet.level * 50; // 50, 100, 150, 200...
  let levelUp = false;
  while (pet.xp >= xpNeeded && pet.level < 999) {
    pet.xp -= pet.level * 50;
    pet.level++;
    levelUp = true;
  }

  await redis.set(petKey(channelId, userId), JSON.stringify(pet));
  return { levelUp, newLevel: pet.level };
}

/** Get shop catalog with prices adjusted for what the player owns */
export async function getShop(channelId: string, userId: string) {
  const pet = await getPet(channelId, userId);
  const ownedItems = pet?.ownedItems ?? [];

  return {
    pets: PET_CATALOG.map(p => ({ ...p, owned: pet?.petId === p.id })),
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
