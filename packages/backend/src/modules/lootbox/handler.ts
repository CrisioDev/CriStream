import { registerHandler } from "../../twitch/message-handler.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { lootboxService } from "./service.js";
import { prisma } from "../../lib/prisma.js";
import type { MessageContext } from "../../twitch/message-handler.js";

// Priority 44 = after soundalerts (43), before songrequests (45)
registerHandler("lootbox", 44, async (ctx: MessageContext) => {
  if (!ctx.channelId) return;

  const channel = await prisma.channel.findUnique({ where: { id: ctx.channelId } });
  if (!channel) return;

  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(prefix)) return;

  const parts = ctx.message.slice(prefix.length).trim().split(/\s+/);
  const cmd = parts[0]!.toLowerCase();

  // !lootbox / !lb — open a lootbox
  if (cmd === "lootbox" || cmd === "lb") {
    const result = await lootboxService.openLootbox(
      ctx.channelId,
      ctx.msg.userInfo.userId,
      ctx.user
    );
    if ("error" in result) {
      sayInChannel(ctx.channel, `@${ctx.user} ${result.error}`);
    } else {
      sayInChannel(ctx.channel, result.message);
    }
    ctx.handled = true;
    return;
  }

  // !inventory / !inv — show inventory
  if (cmd === "inventory" || cmd === "inv") {
    const items = await lootboxService.getInventory(ctx.channelId, ctx.msg.userInfo.userId);
    if (items.length === 0) {
      sayInChannel(ctx.channel, `@${ctx.user} Dein Inventar ist leer! Versuch !lootbox`);
    } else {
      const summary = items
        .slice(0, 5)
        .map((i) => `${i.itemName} x${i.quantity}`)
        .join(", ");
      const more = items.length > 5 ? ` (+${items.length - 5} mehr)` : "";
      sayInChannel(ctx.channel, `@${ctx.user} Inventar: ${summary}${more}`);
    }
    ctx.handled = true;
    return;
  }

  // !equip <title name> — equip a chat title
  if (cmd === "equip") {
    const titleName = parts.slice(1).join(" ").toLowerCase().replace(/"/g, "");
    if (!titleName) {
      sayInChannel(ctx.channel, `@${ctx.user} Nutze: !equip <Titel-Name>`);
      ctx.handled = true;
      return;
    }
    const items = await lootboxService.getInventory(ctx.channelId, ctx.msg.userInfo.userId);

    // Check if user has a non-title item with that name (helpful error)
    const anyMatch = items.find((i) => i.itemName.toLowerCase() === titleName);
    if (anyMatch && anyMatch.itemType !== "title") {
      sayInChannel(ctx.channel, `@${ctx.user} "${anyMatch.itemName}" ist kein Titel! Nur Items vom Typ "Chat Title" können equipped werden.`);
      ctx.handled = true;
      return;
    }

    // Find title - exact match first, then partial match
    const titles = items.filter((i) => i.itemType === "title");
    let titleItem = titles.find((i) => i.itemName.toLowerCase() === titleName);
    if (!titleItem) {
      titleItem = titles.find((i) => i.itemName.toLowerCase().startsWith(titleName));
    }

    if (!titleItem) {
      const ownedTitles = titles.map((i) => i.itemName).join(", ");
      if (ownedTitles) {
        sayInChannel(ctx.channel, `@${ctx.user} Diesen Titel hast du nicht! Deine Titel: ${ownedTitles}`);
      } else {
        sayInChannel(ctx.channel, `@${ctx.user} Du hast noch keine Titel! Öffne Lootboxen mit !lootbox`);
      }
      ctx.handled = true;
      return;
    }
    const titlePrefix = (titleItem.itemConfig as any)?.prefix ?? `[${titleItem.itemName}]`;
    await lootboxService.equipTitle(ctx.channelId, ctx.msg.userInfo.userId, titlePrefix);
    sayInChannel(ctx.channel, `@${ctx.user} Titel equipped: ${titlePrefix}`);
    ctx.handled = true;
    return;
  }

  // !unequip — remove title
  if (cmd === "unequip") {
    await lootboxService.unequipTitle(ctx.channelId, ctx.msg.userInfo.userId);
    sayInChannel(ctx.channel, `@${ctx.user} Titel entfernt!`);
    ctx.handled = true;
    return;
  }
});
