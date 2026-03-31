import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";

const LINK_CODE_PREFIX = "linkcode:";
const LINK_CODE_TTL = 300; // 5 minutes

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// Create a code from either platform
export async function createLinkCode(platform: "twitch" | "discord", platformUserId: string): Promise<string> {
  const code = generateCode();
  await redis.set(`${LINK_CODE_PREFIX}${code}`, JSON.stringify({ platform, platformUserId }), "EX", LINK_CODE_TTL);
  return code;
}

// Redeem from either platform — the code tells us which platform created it
export async function redeemLinkCode(
  redeemPlatform: "twitch" | "discord",
  redeemUserId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const key = `${LINK_CODE_PREFIX}${code}`;
  const raw = await redis.get(key);

  if (!raw) {
    return { success: false, error: "Code ungültig oder abgelaufen. Generiere einen neuen mit !link." };
  }

  const { platform: codePlatform, platformUserId: codeUserId } = JSON.parse(raw);

  // Must redeem from the OTHER platform
  if (codePlatform === redeemPlatform) {
    return { success: false, error: "Gib den Code auf der anderen Plattform ein (Twitch ↔ Discord)." };
  }

  const twitchUserId = codePlatform === "twitch" ? codeUserId : redeemUserId;
  const discordUserId = codePlatform === "discord" ? codeUserId : redeemUserId;

  // Check if either account is already linked
  const existing = await prisma.accountLink.findFirst({
    where: { OR: [{ twitchUserId }, { discordUserId }] },
  });

  if (existing) {
    if (existing.twitchUserId === twitchUserId && existing.discordUserId === discordUserId) {
      return { success: false, error: "Diese Accounts sind bereits verbunden!" };
    }
    await prisma.accountLink.delete({ where: { id: existing.id } });
  }

  await prisma.accountLink.create({
    data: { twitchUserId, discordUserId },
  });

  await redis.del(key);
  await migrateInventory(discordUserId, twitchUserId);

  logger.info({ twitchUserId, discordUserId }, "Accounts linked");
  return { success: true };
}

export async function resolveUserId(platform: "twitch" | "discord", platformUserId: string): Promise<string> {
  if (platform === "twitch") return platformUserId;

  // Discord user — check if linked to Twitch
  const link = await prisma.accountLink.findUnique({
    where: { discordUserId: platformUserId },
  });

  return link ? link.twitchUserId : `discord:${platformUserId}`;
}

async function migrateInventory(discordUserId: string, twitchUserId: string): Promise<void> {
  const discordId = `discord:${discordUserId}`;

  // Find all Discord inventory items
  const discordItems = await prisma.viewerInventoryItem.findMany({
    where: { twitchUserId: discordId },
  });

  for (const item of discordItems) {
    // Try to merge into existing Twitch inventory
    const existing = await prisma.viewerInventoryItem.findUnique({
      where: {
        channelId_twitchUserId_itemId: {
          channelId: item.channelId,
          twitchUserId,
          itemId: item.itemId,
        },
      },
    });

    if (existing) {
      // Merge quantities
      await prisma.viewerInventoryItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: item.quantity } },
      });
      await prisma.viewerInventoryItem.delete({ where: { id: item.id } });
    } else {
      // Transfer ownership
      await prisma.viewerInventoryItem.update({
        where: { id: item.id },
        data: { twitchUserId },
      });
    }
  }

  // Migrate active titles
  const discordTitles = await prisma.activeTitle.findMany({
    where: { twitchUserId: discordId },
  });
  for (const title of discordTitles) {
    const existingTitle = await prisma.activeTitle.findUnique({
      where: { channelId_twitchUserId: { channelId: title.channelId, twitchUserId } },
    });
    if (!existingTitle) {
      await prisma.activeTitle.update({
        where: { id: title.id },
        data: { twitchUserId },
      });
    } else {
      await prisma.activeTitle.delete({ where: { id: title.id } });
    }
  }

  logger.info({ discordUserId, twitchUserId, migratedItems: discordItems.length }, "Discord inventory migrated to Twitch");
}
