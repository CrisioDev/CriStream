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
      sayInChannel(ctx.channel, `@${ctx.user} Your inventory is empty! Try !lootbox`);
    } else {
      const summary = items
        .slice(0, 5)
        .map((i) => `${i.itemName} x${i.quantity}`)
        .join(", ");
      const more = items.length > 5 ? ` (+${items.length - 5} more)` : "";
      sayInChannel(ctx.channel, `@${ctx.user} Inventory: ${summary}${more}`);
    }
    ctx.handled = true;
    return;
  }

  // !equip <title name> — equip a chat title
  if (cmd === "equip") {
    const titleName = parts.slice(1).join(" ").toLowerCase();
    if (!titleName) {
      sayInChannel(ctx.channel, `@${ctx.user} Usage: !equip <title name>`);
      ctx.handled = true;
      return;
    }
    const items = await lootboxService.getInventory(ctx.channelId, ctx.msg.userInfo.userId);
    const titleItem = items.find(
      (i) => i.itemType === "title" && i.itemName.toLowerCase() === titleName
    );
    if (!titleItem) {
      sayInChannel(ctx.channel, `@${ctx.user} You don't have that title!`);
      ctx.handled = true;
      return;
    }
    const prefix = (titleItem.itemConfig as any)?.prefix ?? `[${titleItem.itemName}]`;
    await lootboxService.equipTitle(ctx.channelId, ctx.msg.userInfo.userId, prefix);
    sayInChannel(ctx.channel, `@${ctx.user} Title equipped: ${prefix}`);
    ctx.handled = true;
    return;
  }

  // !unequip — remove title
  if (cmd === "unequip") {
    await lootboxService.unequipTitle(ctx.channelId, ctx.msg.userInfo.userId);
    sayInChannel(ctx.channel, `@${ctx.user} Title removed!`);
    ctx.handled = true;
    return;
  }
});
