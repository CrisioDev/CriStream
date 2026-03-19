import { Client, GatewayIntentBits, type TextChannel } from "discord.js";
import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { setupDiscordMessageHandler } from "./discord-message-handler.js";
import { registerSlashCommands, handleSlashCommand } from "./slash-commands.js";

let client: Client | null = null;

export interface DiscordClientInfo {
  isReady: boolean;
  guildCount: number;
}

export function getDiscordClient(): DiscordClientInfo {
  return {
    isReady: client?.isReady() ?? false,
    guildCount: client?.guilds.cache.size ?? 0,
  };
}

export function getDiscordClientRaw(): Client | null {
  return client;
}

export async function initDiscordClient(): Promise<void> {
  if (!config.discordBotToken) {
    logger.info("No DISCORD_BOT_TOKEN set — Discord bot disabled");
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("ready", async () => {
    logger.info({ user: client!.user?.tag, guilds: client!.guilds.cache.size }, "Discord bot ready");

    // Register slash commands on all guilds
    if (config.discordClientId) {
      try {
        await registerSlashCommands(client!);
      } catch (err) {
        logger.error({ err }, "Failed to register slash commands on startup");
      }
    }
  });

  // Text message handling
  setupDiscordMessageHandler(client);

  // Slash command handling
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleSlashCommand(interaction);
    } catch (err) {
      logger.error({ err }, "Slash command error");
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "An error occurred.", ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => {});
      }
    }
  });

  client.on("error", (err) => {
    logger.error({ err }, "Discord client error");
  });

  await client.login(config.discordBotToken);
}

export async function sendToDiscordChannel(channelId: string, content: string): Promise<void> {
  if (!client?.isReady() || !channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && "send" in channel) {
      await (channel as TextChannel).send(content);
    }
  } catch (err) {
    logger.error({ err, channelId }, "Failed to send Discord message");
  }
}

export async function sendEmbedToDiscordChannel(channelId: string, embed: any): Promise<void> {
  if (!client?.isReady() || !channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && "send" in channel) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  } catch (err) {
    logger.error({ err, channelId }, "Failed to send Discord embed");
  }
}
