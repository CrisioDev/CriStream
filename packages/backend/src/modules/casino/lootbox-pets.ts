import { redis } from "../../lib/redis.js";

/**
 * Lootbox-exclusive Pets & Items
 *
 * Ultra-rare pets and epic items that can ONLY be obtained from lootbox pulls.
 * Integrated into the progression system after each game.
 */

// ── Lootbox Pet Definitions ──
export interface LootboxPet {
  id: string;
  name: string;
  emoji: string;
  bonus: string;
  perLevel: number;
  rarity: "legendary";
}

export const LOOTBOX_PETS: LootboxPet[] = [
  { id: "ghost_cat", name: "Geister-Katze", emoji: "👻🐱", bonus: "all", perLevel: 0.015, rarity: "legendary" },
  { id: "golden_dragon", name: "Goldener Drache", emoji: "✨🐉", bonus: "payout", perLevel: 0.04, rarity: "legendary" },
  { id: "crystal_wolf", name: "Kristall-Wolf", emoji: "💎🐺", bonus: "boss_dmg", perLevel: 0.06, rarity: "legendary" },
  { id: "shadow_phoenix", name: "Schatten-Phoenix", emoji: "🌑🔥", bonus: "specials", perLevel: 0.02, rarity: "legendary" },
  { id: "cosmic_bunny", name: "Kosmischer Hase", emoji: "🌌🐰", bonus: "xp", perLevel: 0.05, rarity: "legendary" },
];

// ── Lootbox Item Definitions ──
export interface LootboxItem {
  category: string;
  name: string;
  emoji: string;
  bonusValue: number;
  rarity: "epic";
}

export const LOOTBOX_ITEMS: LootboxItem[] = [
  { category: "hat", name: "Diamant-Krone", emoji: "💎👑", bonusValue: 30, rarity: "epic" },
  { category: "glasses", name: "Holo-Visor", emoji: "🔮", bonusValue: 15, rarity: "epic" },
  { category: "cape", name: "Regenbogen-Flügel", emoji: "🌈🪽", bonusValue: 8, rarity: "epic" },
  { category: "weapon", name: "Plasma-Schwert", emoji: "⚡🗡️", bonusValue: 25, rarity: "epic" },
  { category: "aura", name: "Sternenstaub", emoji: "🌠", bonusValue: 12, rarity: "epic" },
  { category: "food", name: "Ambrosia", emoji: "🏺", bonusValue: 60, rarity: "epic" },
];

/** Roll for a lootbox-exclusive pet (1/1000 chance = 0.1%) */
export function rollLootboxPet(): { pet: LootboxPet } | null {
  if (Math.random() >= 1 / 1000) return null;
  const pet = LOOTBOX_PETS[Math.floor(Math.random() * LOOTBOX_PETS.length)]!;
  return { pet };
}

/** Roll for a lootbox-exclusive item (1/200 chance = 0.5%) */
export function rollLootboxItem(): { item: LootboxItem } | null {
  if (Math.random() >= 1 / 200) return null;
  const item = LOOTBOX_ITEMS[Math.floor(Math.random() * LOOTBOX_ITEMS.length)]!;
  return { item };
}

function petKey(channelId: string, userId: string): string {
  return `casino:pet:${channelId}:${userId}`;
}

/** Grant a lootbox pet to a user's pet collection */
export async function grantLootboxPet(channelId: string, userId: string, petId: string): Promise<void> {
  const petDef = LOOTBOX_PETS.find(p => p.id === petId);
  if (!petDef) return;

  const raw = await redis.get(petKey(channelId, userId));
  if (!raw) {
    // User has no pet data yet — create fresh collection with lootbox pet
    const data = {
      activePetId: petId,
      pets: [{ petId, petName: petDef.name, level: 1, xp: 0 }],
      equipped: {},
      ownedItems: [],
      totalSpent: 0,
      care: {
        happiness: 100, hunger: 100, cleanliness: 100,
        lastFed: Date.now(), lastWalked: Date.now(), lastCleaned: Date.now(),
        needsPoop: false, walkCount: 0, feedCount: 0,
      },
    };
    await redis.set(petKey(channelId, userId), JSON.stringify(data));
    return;
  }

  const data = JSON.parse(raw);
  // Don't add duplicate
  if (data.pets?.some((p: any) => p.petId === petId)) return;

  if (!data.pets) data.pets = [];
  data.pets.push({ petId, petName: petDef.name, level: 1, xp: 0 });
  await redis.set(petKey(channelId, userId), JSON.stringify(data));
}

/** Grant a lootbox item to a user — auto-equip if slot is empty */
export async function grantLootboxItem(channelId: string, userId: string, category: string, emoji: string, bonusValue: number): Promise<void> {
  const raw = await redis.get(petKey(channelId, userId));
  if (!raw) return; // Need a pet collection to hold items

  const data = JSON.parse(raw);
  if (!data.ownedItems) data.ownedItems = [];
  if (!data.equipped) data.equipped = {};

  // Store as special lootbox item key
  const itemKey = `lootbox:${category}:${emoji}:${bonusValue}`;
  data.ownedItems.push(itemKey);

  // Auto-equip if slot is empty
  if (!data.equipped[category]) {
    data.equipped[category] = emoji;
  }

  await redis.set(petKey(channelId, userId), JSON.stringify(data));
}
