import type { Client, Message, PermissionsBitField } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { handleCommand } from "../modules/commands/executor.js";
import { viewerRequestService } from "../modules/requests/service.js";
import { incrementDiscordLines } from "../modules/timers/timer-scheduler.js";
import { chatLogService } from "../modules/chatlogs/service.js";
import { pointsService } from "../modules/points/service.js";
import { redis } from "../lib/redis.js";
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
  const POINTS_COMMANDS = ["points", "lootbox", "lb", "inventory", "inv", "equip", "unequip", "link", "profil", "profile", "markt", "marketplace", "marktplatz", "trade", "trades", "tauschen", "slots", "slot", "rubbellos", "scratch", "rubbel"];

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

  // ── Gambling commands on Discord ──
  if (cmd === "slots" || cmd === "slot" || cmd === "rubbellos" || cmd === "scratch" || cmd === "rubbel") {
    try {
      const { resolveUserId } = await import("../modules/lootbox/account-link.js");
      const resolvedId = await resolveUserId("discord", message.author.id);
      const displayName = message.author.displayName ?? message.author.username;

      // Import gambling logic inline (same logic as Twitch handler)
      const SLOT_COST = 25;
      const SCRATCH_COST = 50;
      const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
      const SLOT_WEIGHTS = [25, 22, 20, 15, 10, 6, 2];
      const SCRATCH_SYMBOLS = ["🍀", "💰", "🎁", "👑", "💎", "🌟"];
      const SCRATCH_WEIGHTS = [30, 25, 20, 12, 8, 5];

      function weightedPick(symbols: string[], weights: number[]): string {
        const total = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * total;
        for (let i = 0; i < symbols.length; i++) {
          roll -= weights[i]!;
          if (roll <= 0) return symbols[i]!;
        }
        return symbols[0]!;
      }

      if (cmd === "slots" || cmd === "slot") {
        const cdKey = `cd:${channel.id}:slots:discord:${message.author.id}`;
        const cdSet = await redis.set(cdKey, "1", "EX", 10, "NX");
        if (!cdSet) { await replyToUser("Slots auf Cooldown!"); return; }
        const user = await pointsService.getUserPoints(channel.id, resolvedId);
        if (!user || user.points < SLOT_COST) { await redis.del(cdKey); await replyToUser(`Nicht genug Punkte! Brauchst ${SLOT_COST}.`); return; }
        await pointsService.deductPoints(channel.id, resolvedId, SLOT_COST);
        const r1 = weightedPick(SLOT_SYMBOLS, SLOT_WEIGHTS), r2 = weightedPick(SLOT_SYMBOLS, SLOT_WEIGHTS), r3 = weightedPick(SLOT_SYMBOLS, SLOT_WEIGHTS);
        let payout = 10, label = "Trostpreis";
        if (r1 === r2 && r2 === r3) {
          const payouts: Record<string, [number, string]> = { "7️⃣": [777, "JACKPOT 777!!!"], "💎": [300, "DIAMANT TRIPLE!"], "⭐": [150, "STERN TRIPLE!"], "🍇": [75, "TRIPLE!"], "🍊": [60, "TRIPLE!"], "🍋": [50, "TRIPLE!"], "🍒": [40, "TRIPLE!"] };
          [payout, label] = payouts[r1] ?? [50, "TRIPLE!"];
        } else if (r1 === r2 || r2 === r3 || r1 === r3) { payout = 30; label = "Doppelt!"; }
        if (payout > 0) await pointsService.addMessagePoints(channel.id, resolvedId, displayName, payout);
        const profit = payout - SLOT_COST;
        await replyToUser(`🎰 [ ${r1} | ${r2} | ${r3} ] ▸ ${label} → ${payout} Punkte (${profit >= 0 ? "+" : ""}${profit})`);
      } else {
        const cdKey = `cd:${channel.id}:scratch:discord:${message.author.id}`;
        const cdSet = await redis.set(cdKey, "1", "EX", 15, "NX");
        if (!cdSet) { await replyToUser("Rubbellos auf Cooldown!"); return; }
        const user = await pointsService.getUserPoints(channel.id, resolvedId);
        if (!user || user.points < SCRATCH_COST) { await redis.del(cdKey); await replyToUser(`Nicht genug Punkte! Brauchst ${SCRATCH_COST}.`); return; }
        await pointsService.deductPoints(channel.id, resolvedId, SCRATCH_COST);
        const s1 = weightedPick(SCRATCH_SYMBOLS, SCRATCH_WEIGHTS), s2 = weightedPick(SCRATCH_SYMBOLS, SCRATCH_WEIGHTS), s3 = weightedPick(SCRATCH_SYMBOLS, SCRATCH_WEIGHTS);
        let payout = 15, label = "Trostpreis";
        if (s1 === s2 && s2 === s3) {
          const payouts: Record<string, [number, string]> = { "🌟": [1000, "MEGA GEWINN!!!"], "💎": [500, "DIAMANT GEWINN!"], "👑": [250, "KÖNIGLICH!"], "🎁": [150, "GESCHENK!"], "💰": [100, "GELDREGEN!"], "🍀": [75, "GLÜCKSKLEE!"] };
          [payout, label] = payouts[s1] ?? [75, "DREIER!"];
        } else if (s1 === s2 || s2 === s3 || s1 === s3) { payout = 35; label = "Zweier!"; }
        if (payout > 0) await pointsService.addMessagePoints(channel.id, resolvedId, displayName, payout);
        const profit = payout - SCRATCH_COST;
        await replyToUser(`🎟️ kratzt... ${s1} ${s2} ${s3} ▸ ${label} → ${payout} Punkte (${profit >= 0 ? "+" : ""}${profit})`);
      }
    } catch (err) {
      logger.error({ err }, "Discord gambling command error");
    }
  }
}
