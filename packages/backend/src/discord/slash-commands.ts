import {
  REST,
  Routes,
  SlashCommandBuilder,
  type Client,
  type ChatInputCommandInteraction,
  type PermissionsBitField,
} from "discord.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { executeCommand } from "../modules/commands/executor.js";
import type { CommandContext } from "../modules/commands/executor.js";

const execFileAsync = promisify(execFile);

export async function registerSlashCommands(client: Client): Promise<void> {
  if (!config.discordClientId || !config.discordBotToken) return;

  const rest = new REST({ version: "10" }).setToken(config.discordBotToken);

  // Get all guilds the bot is in
  const guilds = client.guilds.cache;

  for (const [guildId, guild] of guilds) {
    try {
      await registerGuildCommands(rest, guildId);
      logger.info({ guildId, guildName: guild.name }, "Slash commands registered for guild");
    } catch (err) {
      logger.error({ err, guildId }, "Failed to register slash commands for guild");
    }
  }
}

export async function registerGuildCommands(rest: REST, guildId: string): Promise<void> {
  // Find DiscordSettings for this guild
  const settings = await prisma.discordSettings.findFirst({
    where: { guildId, commandsEnabled: true },
  });

  if (!settings) {
    // Clear commands if disabled
    await rest.put(Routes.applicationGuildCommands(config.discordClientId, guildId), {
      body: [],
    });
    return;
  }

  // Get enabled commands for this channel
  const commands = await prisma.command.findMany({
    where: { channelId: settings.channelId, enabled: true },
  });

  const slashCommands = commands
    .filter((cmd) => /^[a-z0-9_-]{1,32}$/.test(cmd.trigger))
    .map((cmd) =>
      new SlashCommandBuilder()
        .setName(cmd.trigger)
        .setDescription(cmd.response.slice(0, 100) || `Command: ${cmd.trigger}`)
        .addStringOption((opt) =>
          opt.setName("args").setDescription("Arguments").setRequired(false)
        )
        .toJSON()
    );

  // Add built-in commands
  slashCommands.push(
    new SlashCommandBuilder()
      .setName("commands")
      .setDescription("List all available commands")
      .toJSON()
  );

  slashCommands.push(
    new SlashCommandBuilder()
      .setName("deploy")
      .setDescription("Deploy the latest version from git (Admin only)")
      .toJSON()
  );

  slashCommands.push(
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Show bot and system status")
      .toJSON()
  );

  await rest.put(Routes.applicationGuildCommands(config.discordClientId, guildId), {
    body: slashCommands,
  });
}

export async function registerCommandsForChannel(channelId: string): Promise<void> {
  if (!config.discordClientId || !config.discordBotToken) return;

  const settings = await prisma.discordSettings.findFirst({
    where: { channelId, commandsEnabled: true },
  });

  if (!settings || !settings.guildId) return;

  const rest = new REST({ version: "10" }).setToken(config.discordBotToken);
  await registerGuildCommands(rest, settings.guildId);
}

export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "Commands only work in servers.", ephemeral: true });
    return;
  }

  const guildId = interaction.guild.id;

  const settings = await prisma.discordSettings.findFirst({
    where: { guildId, commandsEnabled: true },
    include: { channel: true },
  });

  if (!settings) {
    await interaction.reply({ content: "Discord commands are not configured for this server.", ephemeral: true });
    return;
  }

  const channel = settings.channel;
  const trigger = interaction.commandName;

  // Handle /deploy (Admin only)
  if (trigger === "deploy") {
    const member = interaction.member;
    const perms = member?.permissions;
    const isAdmin = typeof perms !== "string" && (perms as PermissionsBitField)?.has("Administrator");
    if (!isAdmin) {
      await interaction.reply({ content: "Only administrators can deploy.", ephemeral: true });
      return;
    }
    await interaction.deferReply();
    try {
      // Pull latest code and rebuild
      const appDir = process.env.DEPLOY_APP_DIR || "/app";
      const gitDir = process.env.DEPLOY_GIT_DIR || "";
      const gitArgs = gitDir
        ? `git --work-tree=${appDir} --git-dir=${gitDir} fetch origin main 2>&1 && git --work-tree=${appDir} --git-dir=${gitDir} checkout -f main 2>&1 && `
        : "";
      const { stdout, stderr } = await execFileAsync("bash", ["-c",
        `cd ${appDir} && ${gitArgs}docker compose build 2>&1 && docker compose up -d 2>&1`
      ], { timeout: 300_000 });
      // Wait for health
      await new Promise(r => setTimeout(r, 10_000));
      const health = await fetch("http://localhost:3000/api/health").then(r => r.json()).catch(() => null);
      const ok = (health as any)?.data?.status === "ok";
      await interaction.editReply(ok
        ? "Deploy successful! App is healthy."
        : "Deploy done but health check unclear. Check logs."
      );
    } catch (err: any) {
      logger.error({ err }, "Deploy via Discord failed");
      await interaction.editReply(`Deploy failed: ${err.message?.slice(0, 200)}`).catch(() => {});
    }
    return;
  }

  // Handle /status
  if (trigger === "status") {
    try {
      const health = await fetch("http://localhost:3000/api/health").then(r => r.json()) as any;
      const d = health.data;
      const uptime = Math.floor(process.uptime());
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      await interaction.reply({
        content: [
          `**CriStream Status**`,
          `Twitch: ${d.twitchConnected ? "Connected" : "Disconnected"} (${d.channels?.join(", ") || "none"})`,
          `Discord: ${d.discordReady ? "Ready" : "Offline"} (${d.discordGuilds} guild${d.discordGuilds !== 1 ? "s" : ""})`,
          `Uptime: ${h}h ${m}m`,
        ].join("\n"),
        ephemeral: true,
      });
    } catch {
      await interaction.reply({ content: "Could not fetch status.", ephemeral: true });
    }
    return;
  }

  // Handle built-in "commands" slash command
  if (trigger === "commands") {
    const commands = await prisma.command.findMany({
      where: { channelId: channel.id, enabled: true },
      orderBy: { trigger: "asc" },
    });
    const list = commands.map((c) => `\`${channel.commandPrefix}${c.trigger}\``).join(", ");
    await interaction.reply({ content: list || "No commands available.", ephemeral: true });
    return;
  }

  // Determine user level
  const member = interaction.member;
  let userLevel = "everyone";
  if (member && member.permissions) {
    const perms = member.permissions;
    if (typeof perms !== "string") {
      if ((perms as PermissionsBitField).has("Administrator")) {
        userLevel = "broadcaster";
      } else if ((perms as PermissionsBitField).has("ManageMessages")) {
        userLevel = "moderator";
      }
    }
  }

  const args = interaction.options.getString("args") ?? "";
  const fakeMessage = `${channel.commandPrefix}${trigger}${args ? " " + args : ""}`;

  await interaction.deferReply();

  let replied = false;
  const cmdCtx: CommandContext = {
    channelId: channel.id,
    channel: channel.displayName,
    user: interaction.user.displayName ?? interaction.user.username,
    userId: interaction.user.id,
    message: fakeMessage,
    userLevel,
    platform: "discord",
    reply: (text: string) => {
      replied = true;
      interaction.editReply(text).catch((err) => {
        logger.error({ err }, "Failed to edit slash command reply");
      });
    },
  };

  await executeCommand(cmdCtx, channel, trigger, 0);

  if (!replied) {
    await interaction.editReply("Command not found or on cooldown.").catch(() => {});
  }
}
