import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { parseVariables } from "./variable-parser.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { emitEvent } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";
import { USER_LEVEL_HIERARCHY } from "@streamguard/shared";
import type { MessageContext } from "../../twitch/message-handler.js";

function getUserLevel(ctx: MessageContext): string {
  if (ctx.isBroadcaster) return "broadcaster";
  if (ctx.isMod) return "moderator";
  if (ctx.isVip) return "vip";
  if (ctx.isSub) return "subscriber";
  return "everyone";
}

registerHandler("commands", 50, async (ctx) => {
  // Try by channelId first, then fall back to display name
  let channel = ctx.msg.channelId
    ? await prisma.channel.findUnique({ where: { twitchId: ctx.msg.channelId } })
    : null;

  if (!channel) {
    channel = await prisma.channel.findFirst({
      where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
    });
  }

  if (!channel) {
    logger.debug({ channel: ctx.channel }, "No channel found for command handling");
    return;
  }

  await handleCommand(ctx, channel);
});

async function handleCommand(
  ctx: MessageContext,
  channel: { id: string; commandPrefix: string }
) {
  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(prefix)) return;

  const trigger = ctx.message.slice(prefix.length).split(" ")[0]!.toLowerCase();

  const command = await prisma.command.findUnique({
    where: { channelId_trigger: { channelId: channel.id, trigger } },
  });

  if (!command || !command.enabled) return;

  // Check user level
  const userLevel = getUserLevel(ctx);
  const userRank = USER_LEVEL_HIERARCHY[userLevel] ?? 0;
  const requiredRank = USER_LEVEL_HIERARCHY[command.userLevel] ?? 0;
  if (userRank < requiredRank) return;

  // Check cooldown
  const cooldownKey = `cd:${channel.id}:${command.trigger}`;
  if (command.cooldownSeconds > 0) {
    const set = await redis.set(cooldownKey, "1", "EX", command.cooldownSeconds, "NX");
    if (!set) return; // On cooldown
  }

  // Increment use count
  const updated = await prisma.command.update({
    where: { id: command.id },
    data: { useCount: { increment: 1 } },
  });

  // Parse variables
  let response = await parseVariables(command.response, ctx);
  response = response.replace("{count}", String(updated.useCount));

  // Send response
  sayInChannel(ctx.channel, response);
  ctx.handled = true;

  logger.info({ user: ctx.user, command: trigger, channel: ctx.channel }, "Command executed");

  emitEvent("command:executed", {
    channel: ctx.channel,
    user: ctx.user,
    command: trigger,
    response,
  });
}
