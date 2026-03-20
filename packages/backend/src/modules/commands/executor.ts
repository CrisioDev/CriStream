import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { parseVariables } from "./variable-parser.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { emitToChannel } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";
import { USER_LEVEL_HIERARCHY } from "@cristream/shared";

export interface CommandContext {
  channelId: string;
  channel: string;
  user: string;
  userId: string;
  message: string;
  userLevel: string;
  platform: "twitch" | "discord";
  reply: (text: string) => void;
}

export async function handleCommand(
  ctx: CommandContext,
  channel: { id: string; commandPrefix: string }
): Promise<void> {
  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(prefix)) return;

  const trigger = ctx.message.slice(prefix.length).split(" ")[0]!.toLowerCase();

  await executeCommand(ctx, channel, trigger, 0);
}

export async function executeCommand(
  ctx: CommandContext,
  channel: { id: string; commandPrefix: string },
  trigger: string,
  depth: number
): Promise<void> {
  if (depth > 5) return; // Max chain depth

  // Find command by trigger
  let command = await prisma.command.findUnique({
    where: { channelId_trigger: { channelId: channel.id, trigger } },
  });

  // If not found by trigger, try alias lookup
  if (!command) {
    command = await prisma.command.findFirst({
      where: {
        channelId: channel.id,
        aliases: { has: trigger },
      },
    });
  }

  if (!command || !command.enabled) return;

  // Check user level (only for first command in chain)
  if (depth === 0) {
    const userRank = USER_LEVEL_HIERARCHY[ctx.userLevel] ?? 0;
    const requiredRank = USER_LEVEL_HIERARCHY[command.userLevel] ?? 0;
    if (userRank < requiredRank) return;

    // Check cooldown (only for first command)
    if (command.cooldownSeconds > 0) {
      const userIdKey = ctx.platform === "discord" ? `discord:${ctx.userId}` : ctx.userId;
      const cooldownKey = command.perUserCooldown
        ? `cd:${channel.id}:${command.trigger}:${userIdKey}`
        : `cd:${channel.id}:${command.trigger}`;
      const set = await redis.set(cooldownKey, "1", "EX", command.cooldownSeconds, "NX");
      if (!set) return; // On cooldown
    }
  }

  // Increment use count
  const updated = await prisma.command.update({
    where: { id: command.id },
    data: { useCount: { increment: 1 } },
  });

  // Parse variables
  let response = await parseVariables(command.response, {
    channel: ctx.channel,
    user: ctx.user,
    userId: ctx.userId,
    message: ctx.message,
  });
  response = response.replace("{count}", String(updated.useCount));

  // Send response
  ctx.reply(response);

  logger.info({ user: ctx.user, command: trigger, channel: ctx.channel, depth, platform: ctx.platform }, "Command executed");

  emitToChannel(channel.id, "command:executed", {
    channelId: channel.id,
    channel: ctx.channel,
    user: ctx.user,
    command: trigger,
    response,
  });

  // Execute chain commands
  if (command.chain && command.chain.length > 0) {
    for (const chainTrigger of command.chain) {
      await executeCommand(ctx, channel, chainTrigger.toLowerCase(), depth + 1);
    }
  }
}
