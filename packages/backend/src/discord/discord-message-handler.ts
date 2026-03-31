import type { Client, Message, PermissionsBitField } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { handleCommand } from "../modules/commands/executor.js";
import { viewerRequestService } from "../modules/requests/service.js";
import { incrementDiscordLines } from "../modules/timers/timer-scheduler.js";
import { chatLogService } from "../modules/chatlogs/service.js";
import { pointsService } from "../modules/points/service.js";
import type { CommandContext } from "../modules/commands/executor.js";

export function setupDiscordMessageHandler(client: Client): void {
  client.on("messageCreate", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
      await processDiscordMessage(message);
    } catch (err) {
      logger.error({ err }, "Discord message handler error");
    }
  });
}

async function processDiscordMessage(message: Message): Promise<void> {
  const guildId = message.guild!.id;

  // Find DiscordSettings that match this guild
  const settings = await prisma.discordSettings.findFirst({
    where: { guildId },
    include: { channel: true },
  });

  if (!settings) return;

  // Count Discord messages for timer thresholds
  incrementDiscordLines(settings.channelId).catch(() => {});

  // Log Discord message
  chatLogService.addToBuffer({
    twitchUserId: message.author.id,
    displayName: message.author.displayName ?? message.author.username,
    message: message.content,
    platform: "discord",
    channelId: settings.channelId,
    createdAt: new Date(),
  });

  // Award points for Discord messages (creates ChannelUser entry if needed)
  try {
    const { resolveUserId } = await import("../modules/lootbox/account-link.js");
    const resolvedId = await resolveUserId("discord", message.author.id);
    const displayName = message.author.displayName ?? message.author.username;
    const ps = await prisma.pointsSettings.findUnique({ where: { channelId: settings.channelId } });
    if (ps?.enabled) {
      await pointsService.addMessagePoints(settings.channelId, resolvedId, displayName, ps.pointsPerMessage);
    } else {
      // Still ensure ChannelUser exists even without points enabled
      await prisma.channelUser.upsert({
        where: { channelId_twitchUserId: { channelId: settings.channelId, twitchUserId: resolvedId } },
        create: { channelId: settings.channelId, twitchUserId: resolvedId, displayName },
        update: { displayName },
      });
    }
  } catch {
    // Non-critical, don't block message processing
  }

  if (!settings.commandsEnabled) return;

  const channel = settings.channel;
  const prefix = channel.commandPrefix;

  // Determine if this message is in an allowed channel
  const isCommandChannel = !settings.commandChannelId || message.channel.id === settings.commandChannelId;
  const isPointsChannel = settings.pointsChannelId && message.channel.id === settings.pointsChannelId;

  // Points/Lootbox commands work in both command channel AND points channel
  const POINTS_COMMANDS = ["points", "lootbox", "lb", "inventory", "inv", "equip", "unequip", "link", "profil", "profile", "markt", "marketplace", "marktplatz", "trade", "trades", "tauschen"];

  if (!message.content.startsWith(prefix)) return;
  const cmdCheck = message.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
  const isPointsCommand = cmdCheck ? POINTS_COMMANDS.includes(cmdCheck) : false;

  // Allow if: in command channel, or in points channel for points commands
  if (!isCommandChannel && !(isPointsChannel && isPointsCommand)) return;

  // If points command used outside points channel, redirect reply there
  const pointsRedirectChannel = (isPointsCommand && !isPointsChannel && settings.pointsChannelId)
    ? settings.pointsChannelId
    : null;

  async function replyToUser(text: string) {
    if (pointsRedirectChannel) {
      try {
        const { getDiscordClientRaw } = await import("./discord-client.js");
        const client = getDiscordClientRaw();
        if (client?.isReady()) {
          const targetCh = await client.channels.fetch(pointsRedirectChannel);
          if (targetCh && "send" in targetCh) {
            await (targetCh as any).send(`<@${message.author.id}> ${text}`);
            return;
          }
        }
      } catch { /* fallback to reply */ }
    }
    await message.reply(text);
  }

  // Handle !gib requests
  if (message.content.startsWith(`${prefix}gib `)) {
    const requestMsg = message.content.slice(prefix.length + 4).trim();
    if (!requestMsg) {
      await message.reply(`Schreib deinen Wunsch nach ${prefix}gib`);
      return;
    }
    if (requestMsg.length > 500) {
      await message.reply("Zu lang! Max 500 Zeichen.");
      return;
    }
    const displayName = message.author.displayName ?? message.author.username;
    await viewerRequestService.create(channel.id, displayName, requestMsg);
    await message.reply("Dein Wunsch wurde eingetragen!");
    logger.info({ user: displayName, channel: channel.displayName, message: requestMsg }, "Viewer request via Discord");
    return;
  }

  // Determine user level from Discord permissions
  const member = message.member;
  let userLevel = "everyone";
  if (member) {
    const perms = member.permissions;
    if (typeof perms !== "string") {
      if ((perms as PermissionsBitField).has("Administrator")) {
        userLevel = "broadcaster";
      } else if ((perms as PermissionsBitField).has("ManageMessages")) {
        userLevel = "moderator";
      }
    }
  }

  const cmdCtx: CommandContext = {
    channelId: channel.id,
    channel: channel.displayName,
    user: message.author.displayName ?? message.author.username,
    userId: message.author.id,
    message: message.content,
    userLevel,
    platform: "discord",
    reply: (text: string) => {
      message.reply(text).catch((err) => {
        logger.error({ err }, "Failed to reply in Discord");
      });
    },
  };

  await handleCommand(cmdCtx, channel);

  // Handle lootbox commands (not in the command DB, handled by dedicated handler)
  const body = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = body[0]?.toLowerCase();
  if (!cmd) return;

  // !points on Discord
  if (cmd === "points") {
    try {
      const { resolveUserId } = await import("../modules/lootbox/account-link.js");
      const resolvedId = await resolveUserId("discord", message.author.id);
      const user = await pointsService.getUserPoints(channel.id, resolvedId);
      const points = user?.points ?? 0;
      const watchH = Math.floor((user?.watchMinutes ?? 0) / 60);
      const watchM = (user?.watchMinutes ?? 0) % 60;
      await replyToUser(`${message.author.displayName} hat ${points} Punkte (Watchtime: ${watchH}h ${watchM}m)`);
    } catch {
      await replyToUser("Punkte konnten nicht abgefragt werden.");
    }
    return;
  }

  if (cmd === "link" || cmd === "lootbox" || cmd === "lb" || cmd === "inventory" || cmd === "inv" ||
      cmd === "equip" || cmd === "unequip" || cmd === "profil" || cmd === "profile" ||
      cmd === "markt" || cmd === "marketplace" || cmd === "marktplatz" ||
      cmd === "trade" || cmd === "trades" || cmd === "tauschen") {
    try {
      const { lootboxService } = await import("../modules/lootbox/service.js");
      const { resolveUserId, redeemLinkCode } = await import("../modules/lootbox/account-link.js");
      const { config } = await import("../config/index.js");
      const discordId = message.author.id;
      const displayName = message.author.displayName ?? message.author.username;
      const userId = await resolveUserId("discord", discordId);

      // !link [CODE] — link Discord ↔ Twitch (DMs stay private)
      if (cmd === "link") {
        const { createLinkCode } = await import("../modules/lootbox/account-link.js");
        const codeArg = body[1];

        if (codeArg) {
          const result = await redeemLinkCode("discord", discordId, codeArg);
          if (result.success) {
            await replyToUser("Accounts verbunden! Dein Twitch- und Discord-Inventar sind jetzt eins.");
          } else {
            await replyToUser(result.error!);
          }
        } else {
          const code = await createLinkCode("discord", discordId);
          try {
            await message.author.send(`Dein Link-Code: **${code}** — Gib auf Twitch \`!link ${code}\` ein (5 Min gültig)`);
            await replyToUser("Link-Code per DM gesendet!");
          } catch {
            await replyToUser(`Dein Link-Code: ${code} — Gib auf Twitch !link ${code} ein (5 Min gültig)`);
          }
        }
        return;
      }

      if (cmd === "lootbox" || cmd === "lb") {
        const result = await lootboxService.openLootbox(channel.id, userId, displayName);
        await replyToUser("error" in result ? result.error : result.message);
      } else if (cmd === "inventory" || cmd === "inv") {
        const items = await lootboxService.getInventory(channel.id, userId);
        if (items.length === 0) {
          await replyToUser("Dein Inventar ist leer! Versuch !lootbox");
        } else {
          const summary = items.slice(0, 5).map(i => `${i.itemName} x${i.quantity}`).join(", ");
          const more = items.length > 5 ? ` (+${items.length - 5} mehr)` : "";
          await replyToUser(`Inventar: ${summary}${more}`);
        }
      } else if (cmd === "equip") {
        const titleName = body.slice(1).join(" ").toLowerCase().replace(/"/g, "");
        if (!titleName) { await replyToUser("Nutze: !equip <Titel-Name>"); return; }
        const items = await lootboxService.getInventory(channel.id, userId);
        const titleItem = items.find(i => i.itemType === "title" && i.itemName.toLowerCase().startsWith(titleName));
        if (!titleItem) { await replyToUser("Diesen Titel hast du nicht!"); return; }
        const titlePrefix = (titleItem.itemConfig as any)?.prefix ?? `[${titleItem.itemName}]`;
        await lootboxService.equipTitle(channel.id, userId, titlePrefix);
        await replyToUser(`Titel equipped: ${titlePrefix}`);
      } else if (cmd === "unequip") {
        await lootboxService.unequipTitle(channel.id, userId);
        await replyToUser("Titel entfernt!");
      } else if (cmd === "profil" || cmd === "profile") {
        const baseUrl = config.publicUrl.replace(/\/$/, "");
        await replyToUser(`Dein Profil: ${baseUrl}/viewer/${channel.displayName}/profile/${userId}`);
      } else if (cmd === "markt" || cmd === "marketplace" || cmd === "marktplatz") {
        const baseUrl = config.publicUrl.replace(/\/$/, "");
        await replyToUser(`Marktplatz: ${baseUrl}/viewer/${channel.displayName}/marketplace`);
      } else if (cmd === "trade" || cmd === "trades" || cmd === "tauschen") {
        const baseUrl = config.publicUrl.replace(/\/$/, "");
        await replyToUser(`Trades: ${baseUrl}/viewer/${channel.displayName}/trades`);
      }
    } catch (err) {
      logger.error({ err }, "Discord lootbox command error");
    }
  }
}
