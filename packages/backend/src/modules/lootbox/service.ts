import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { emitToChannel } from "../../lib/socket.js";
import { pointsService } from "../points/service.js";
import type {
  LootboxSettingsDto,
  UpdateLootboxSettingsDto,
  LootboxItemDto,
  LootboxItemType,
  LootboxRarity,
  ViewerInventoryItemDto,
} from "@cristream/shared";

const RARITY_DEFAULT_WEIGHT: Record<string, number> = {
  common: 50,
  uncommon: 25,
  rare: 15,
  epic: 8,
  legendary: 2,
};

const RARITY_EMOJI: Record<string, string> = {
  common: "⬜",
  uncommon: "🟩",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟨",
};

class LootboxService {
  // ── Settings ──

  async getSettings(channelId: string): Promise<LootboxSettingsDto> {
    const s = await prisma.lootboxSettings.findUnique({ where: { channelId } });
    if (!s) return { id: "", channelId, enabled: false, cost: 100, cooldownSeconds: 30 };
    return s;
  }

  async updateSettings(channelId: string, data: UpdateLootboxSettingsDto): Promise<LootboxSettingsDto> {
    return prisma.lootboxSettings.upsert({
      where: { channelId },
      create: {
        channelId,
        enabled: data.enabled ?? false,
        cost: data.cost ?? 100,
        cooldownSeconds: data.cooldownSeconds ?? 30,
      },
      update: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.cooldownSeconds !== undefined && { cooldownSeconds: data.cooldownSeconds }),
      },
    });
  }

  // ── Items ──

  async getItems(channelId: string): Promise<LootboxItemDto[]> {
    const items = await prisma.lootboxItem.findMany({
      where: { channelId },
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
    });
    return items.map(this.toItemDto);
  }

  async createItem(channelId: string, data: any): Promise<LootboxItemDto> {
    const weight = data.weight ?? RARITY_DEFAULT_WEIGHT[data.rarity] ?? 50;
    const item = await prisma.lootboxItem.create({
      data: {
        channelId,
        name: data.name,
        description: data.description ?? "",
        type: data.type,
        rarity: data.rarity,
        weight,
        enabled: data.enabled ?? true,
        config: data.config ?? {},
      },
    });
    return this.toItemDto(item);
  }

  async updateItem(channelId: string, id: string, data: any): Promise<LootboxItemDto> {
    const item = await prisma.lootboxItem.update({
      where: { id, channelId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.rarity !== undefined && { rarity: data.rarity }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.config !== undefined && { config: data.config }),
      },
    });
    return this.toItemDto(item);
  }

  async deleteItem(channelId: string, id: string): Promise<void> {
    await prisma.lootboxItem.delete({ where: { id, channelId } });
  }

  // ── Open Lootbox ──

  async openLootbox(
    channelId: string,
    twitchUserId: string,
    displayName: string
  ): Promise<{ item: LootboxItemDto; message: string } | { error: string }> {
    const settings = await this.getSettings(channelId);
    if (!settings.enabled) return { error: "Lootbox is disabled." };

    // Check cooldown
    const cdKey = `cd:${channelId}:lootbox:${twitchUserId}`;
    const cdSet = await redis.set(cdKey, "1", "EX", settings.cooldownSeconds, "NX");
    if (!cdSet) return { error: "Lootbox on cooldown!" };

    // Check points
    const user = await pointsService.getUserPoints(channelId, twitchUserId);
    if (!user || user.points < settings.cost) {
      await redis.del(cdKey); // refund cooldown
      return { error: `Not enough points! Need ${settings.cost}, have ${user?.points ?? 0}.` };
    }

    // Get enabled items
    const items = await prisma.lootboxItem.findMany({
      where: { channelId, enabled: true },
    });
    if (items.length === 0) {
      await redis.del(cdKey);
      return { error: "No items in lootbox!" };
    }

    // Deduct points
    await pointsService.deductPoints(channelId, twitchUserId, settings.cost);

    // Weighted random selection
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = items[0]!;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) {
        selected = item;
        break;
      }
    }

    const itemDto = this.toItemDto(selected);
    const config = selected.config as Record<string, any>;

    // Apply immediate effects
    switch (selected.type) {
      case "bonus_points": {
        const amount = config.amount ?? 0;
        if (amount > 0) {
          await pointsService.addMessagePoints(channelId, twitchUserId, displayName, amount);
        }
        break;
      }
      case "sound": {
        const soundUrl = config.soundUrl ?? "";
        if (soundUrl) {
          emitToChannel(channelId, "sound:play", {
            channelId,
            soundUrl,
            volume: config.volume ?? 80,
          });
        }
        break;
      }
      case "point_multiplier": {
        // Store as active multiplier in Redis
        const mult = config.multiplier ?? 2;
        const durationMin = config.durationMinutes ?? 30;
        const multKey = `mult:${channelId}:${twitchUserId}`;
        await redis.set(multKey, String(mult), "EX", durationMin * 60);
        break;
      }
    }

    // Add to inventory (upsert for stacking)
    await prisma.viewerInventoryItem.upsert({
      where: {
        channelId_twitchUserId_itemId: { channelId, twitchUserId, itemId: selected.id },
      },
      create: {
        channelId,
        twitchUserId,
        displayName,
        itemId: selected.id,
        quantity: 1,
      },
      update: {
        quantity: { increment: 1 },
        displayName,
      },
    });

    const emoji = RARITY_EMOJI[selected.rarity] ?? "";
    const msg = `${emoji} ${displayName} got ${selected.rarity.toUpperCase()}: ${selected.name}! ${selected.description ? "— " + selected.description : ""}`;

    return { item: itemDto, message: msg };
  }

  // ── Inventory ──

  async getInventory(channelId: string, twitchUserId: string): Promise<ViewerInventoryItemDto[]> {
    const items = await prisma.viewerInventoryItem.findMany({
      where: { channelId, twitchUserId },
      include: { item: true },
      orderBy: { acquiredAt: "desc" },
    });
    return items.map((i) => ({
      id: i.id,
      twitchUserId: i.twitchUserId,
      displayName: i.displayName,
      itemName: i.item.name,
      itemType: i.item.type as LootboxItemType,
      itemRarity: i.item.rarity as LootboxRarity,
      itemConfig: i.item.config as Record<string, unknown>,
      quantity: i.quantity,
      acquiredAt: i.acquiredAt.toISOString(),
    }));
  }

  async getAllInventory(channelId: string): Promise<ViewerInventoryItemDto[]> {
    const items = await prisma.viewerInventoryItem.findMany({
      where: { channelId },
      include: { item: true },
      orderBy: { acquiredAt: "desc" },
      take: 200,
    });
    return items.map((i) => ({
      id: i.id,
      twitchUserId: i.twitchUserId,
      displayName: i.displayName,
      itemName: i.item.name,
      itemType: i.item.type as LootboxItemType,
      itemRarity: i.item.rarity as LootboxRarity,
      itemConfig: i.item.config as Record<string, unknown>,
      quantity: i.quantity,
      acquiredAt: i.acquiredAt.toISOString(),
    }));
  }

  // ── Titles ──

  async equipTitle(channelId: string, twitchUserId: string, title: string): Promise<void> {
    await prisma.activeTitle.upsert({
      where: { channelId_twitchUserId: { channelId, twitchUserId } },
      create: { channelId, twitchUserId, title },
      update: { title },
    });
    await redis.del(`title:${channelId}:${twitchUserId}`);
  }

  async unequipTitle(channelId: string, twitchUserId: string): Promise<void> {
    await prisma.activeTitle.deleteMany({ where: { channelId, twitchUserId } });
    await redis.del(`title:${channelId}:${twitchUserId}`);
  }

  async getActiveTitle(channelId: string, twitchUserId: string): Promise<string | null> {
    const cacheKey = `title:${channelId}:${twitchUserId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached === "__none__" ? null : cached;

    const active = await prisma.activeTitle.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId } },
    });
    await redis.set(cacheKey, active?.title ?? "__none__", "EX", 300);
    return active?.title ?? null;
  }

  // ── Multiplier ──

  async getActiveMultiplier(channelId: string, twitchUserId: string): Promise<number> {
    const val = await redis.get(`mult:${channelId}:${twitchUserId}`);
    return val ? parseFloat(val) : 1;
  }

  private toItemDto(item: any): LootboxItemDto {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      type: item.type as LootboxItemType,
      rarity: item.rarity as LootboxRarity,
      weight: item.weight,
      enabled: item.enabled,
      config: item.config as Record<string, unknown>,
      channelId: item.channelId,
    };
  }
}

export const lootboxService = new LootboxService();
