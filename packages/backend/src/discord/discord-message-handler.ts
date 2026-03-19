import type { Client, Message, PermissionsBitField } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { handleCommand } from "../modules/commands/executor.js";
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
    where: { guildId, commandsEnabled: true },
    include: { channel: true },
  });

  if (!settings) return;

  // Only respond in configured command channel (or anywhere if not set)
  if (settings.commandChannelId && message.channel.id !== settings.commandChannelId) return;

  const channel = settings.channel;

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
}
