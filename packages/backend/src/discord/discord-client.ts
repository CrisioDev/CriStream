import { Client, GatewayIntentBits, type TextChannel } from "discord.js";
import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { setupDiscordMessageHandler } from "./discord-message-handler.js";
import { registerSlashCommands, handleSlashCommand } from "./slash-commands.js";

let client: Client | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let loginAttempts = 0;

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
  await connectDiscord();
}

async function connectDiscord(): Promise<void> {
  const c = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  client = c;

  c.on("ready", async () => {
    loginAttempts = 0;
    logger.info({ user: c.user?.tag, guilds: c.guilds.cache.size }, "Discord bot ready");

    // Register slash commands on all guilds
    if (config.discordClientId) {
      try {
        await registerSlashCommands(c);
      } catch (err) {
        logger.error({ err }, "Failed to register slash commands on startup");
      }
    }
  });

  // Text message handling
  setupDiscordMessageHandler(c);

  // Slash command handling
  c.on("interactionCreate", async (interaction) => {
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

  // Gateway resilience: errors must be observed here so they never bubble up
  // as unhandled 'error' events and crash the process.
  c.on("error", (err) => {
    logger.error({ err }, "Discord client error");
  });
  c.on("shardError", (err) => {
    logger.error({ err }, "Discord shard error");
  });
  c.on("shardDisconnect", (_event, shardId) => {
    logger.warn({ shardId }, "Discord shard disconnected");
  });
  c.on("shardResume", (shardId) => {
    logger.info({ shardId }, "Discord shard resumed");
  });

  try {
    await c.login(config.discordBotToken);
  } catch (err: any) {
    await c.destroy().catch(() => {});
    if (err?.code === "TokenInvalid") {
      logger.error("DISCORD_BOT_TOKEN is invalid — Discord bot disabled until the token is fixed");
      return;
    }
    scheduleReconnect(err);
    throw err;
  }
}

function scheduleReconnect(err: unknown): void {
  if (reconnectTimer) return;
  loginAttempts++;
  const delayMs = Math.min(15_000 * 2 ** (loginAttempts - 1), 300_000);
  logger.warn({ err, attempt: loginAttempts, delayMs }, "Discord login failed — retry scheduled");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectDiscord().catch(() => {
      // connectDiscord schedules the next retry itself
    });
  }, delayMs);
}

export async function sendToDiscordChannel(channelId: string, content: string): Promise<void> {
  if (!client?.isReady() || !channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && "send" in channel) {
      await (channel as TextChannel).send(content);
    }
  } catch (err: any) {
    if (err?.code === 50013) {
      logger.warn(
        { channelId },
        "Discord: bot lacks permission to post in this channel — grant it Send Messages there"
      );
    } else {
      logger.error({ err, channelId }, "Failed to send Discord message");
    }
  }
}

export async function sendEmbedToDiscordChannel(channelId: string, embed: any): Promise<void> {
  if (!client?.isReady() || !channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && "send" in channel) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  } catch (err: any) {
    if (err?.code === 50013) {
      logger.warn(
        { channelId },
        "Discord: bot lacks permission to post in this channel — grant it Send Messages there"
      );
    } else {
      logger.error({ err, channelId }, "Failed to send Discord embed");
    }
  }
}
