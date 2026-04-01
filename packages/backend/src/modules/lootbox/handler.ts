import { registerHandler } from "../../twitch/message-handler.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { lootboxService } from "./service.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config/index.js";
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

    // Collect all available titles: lootbox inventory + earned (season pass, achievements, prestige)
    const titles = items.filter((i) => i.itemType === "title");
    const allTitleNames = titles.map(t => t.itemName);

    // Add earned titles from season pass
    try {
      const { getSeasonProgress } = await import("../casino/battlepass.js");
      const sd = await getSeasonProgress(ctx.channelId, ctx.msg.userInfo.userId);
      const rewards = (sd.season.rewards as any[]) ?? [];
      for (const r of rewards) {
        if (r.type === "title" && sd.progress.claimedLevels.includes(r.level) && !allTitleNames.includes(r.value)) {
          allTitleNames.push(r.value);
        }
      }
    } catch { /* non-critical */ }

    // Add prestige titles
    try {
      const { redis } = await import("../../lib/redis.js");
      const prestige = await redis.get(`casino:prestige:${ctx.channelId}:${ctx.msg.userInfo.userId}`);
      if (prestige) {
        for (let i = 1; i <= parseInt(prestige); i++) {
          const t = i <= 10 ? ["Prestige I","Prestige II","Prestige III","Prestige IV","Prestige V","Prestige VI","Prestige VII","Prestige VIII","Prestige IX","Prestige X"][i-1]! : `Prestige ${i}`;
          if (!allTitleNames.includes(t)) allTitleNames.push(t);
        }
      }
    } catch { /* non-critical */ }

    // Add achievement-based titles
    try {
      const { prisma } = await import("../../lib/prisma.js");
      const achTitles = await prisma.viewerAchievement.findMany({
        where: { channelId: ctx.channelId, twitchUserId: ctx.msg.userInfo.userId },
        select: { achievementId: true },
      });
      const { ACHIEVEMENTS } = await import("../casino/achievements.js");
      for (const a of achTitles) {
        const def = ACHIEVEMENTS.find((d: any) => d.id === a.achievementId);
        if (def?.reward?.title && !allTitleNames.includes(def.reward.title)) {
          allTitleNames.push(def.reward.title);
        }
      }
    } catch { /* non-critical */ }

    // Find matching title
    let matchedTitle = allTitleNames.find(t => t.toLowerCase() === titleName);
    if (!matchedTitle) matchedTitle = allTitleNames.find(t => t.toLowerCase().startsWith(titleName));

    if (!matchedTitle) {
      // Check lootbox items for title with config prefix
      const titleItem = titles.find((i) => i.itemName.toLowerCase() === titleName || i.itemName.toLowerCase().startsWith(titleName));
      if (titleItem) {
        const titlePrefix = (titleItem.itemConfig as any)?.prefix ?? `[${titleItem.itemName}]`;
        await lootboxService.equipTitle(ctx.channelId, ctx.msg.userInfo.userId, titlePrefix);
        sayInChannel(ctx.channel, `@${ctx.user} Titel equipped: ${titlePrefix}`);
        ctx.handled = true;
        return;
      }
      if (allTitleNames.length > 0) {
        sayInChannel(ctx.channel, `@${ctx.user} Diesen Titel hast du nicht! Deine Titel: ${allTitleNames.join(", ")}`);
      } else {
        sayInChannel(ctx.channel, `@${ctx.user} Du hast noch keine Titel! Öffne Lootboxen mit !lootbox`);
      }
      ctx.handled = true;
      return;
    }

    const titlePrefix = `[${matchedTitle}]`;
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

  // !link [CODE] — link Twitch ↔ Discord account
  if (cmd === "link") {
    const { createLinkCode, redeemLinkCode } = await import("./account-link.js");
    const codeArg = parts[1];

    if (codeArg) {
      // Redeeming a code from Discord
      const result = await redeemLinkCode("twitch", ctx.msg.userInfo.userId, codeArg);
      sayInChannel(ctx.channel, `@${ctx.user} ${result.success ? "Accounts verbunden! Inventar wird geteilt." : result.error}`);
    } else {
      // Generate code — send as whisper
      const code = await createLinkCode("twitch", ctx.msg.userInfo.userId);
      try {
        const { sendWhisper } = await import("../../twitch/twitch-api.js");
        const channel = await prisma.channel.findUnique({ where: { id: ctx.channelId } });
        if (channel) {
          await sendWhisper(channel.twitchId, ctx.msg.userInfo.userId, `Dein Link-Code: ${code} — Gib auf Discord !link ${code} ein (5 Min gültig)`);
          sayInChannel(ctx.channel, `@${ctx.user} Link-Code per Flüsternachricht gesendet!`);
        }
      } catch {
        // Whisper fallback — some accounts can't receive whispers
        sayInChannel(ctx.channel, `@${ctx.user} Dein Link-Code: ${code} — Gib auf Discord !link ${code} ein (5 Min gültig)`);
      }
    }
    ctx.handled = true;
    return;
  }

  // !profil — link to viewer profile
  if (cmd === "profil" || cmd === "profile") {
    const baseUrl = config.publicUrl.replace(/\/$/, "");
    sayInChannel(ctx.channel, `@${ctx.user} Dein Profil: ${baseUrl}/viewer/${ctx.channel}/profile/${ctx.msg.userInfo.userId}`);
    ctx.handled = true;
    return;
  }

  // !markt / !marketplace — link to marketplace
  if (cmd === "markt" || cmd === "marketplace" || cmd === "marktplatz") {
    const baseUrl = config.publicUrl.replace(/\/$/, "");
    sayInChannel(ctx.channel, `Marktplatz: ${baseUrl}/viewer/${ctx.channel}/marketplace`);
    ctx.handled = true;
    return;
  }

  // !trade / !trades — link to trades page
  if (cmd === "trade" || cmd === "trades" || cmd === "tauschen") {
    const baseUrl = config.publicUrl.replace(/\/$/, "");
    sayInChannel(ctx.channel, `@${ctx.user} Trades: ${baseUrl}/viewer/${ctx.channel}/trades`);
    ctx.handled = true;
    return;
  }
});
