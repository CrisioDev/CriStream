import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { logger } from "../../lib/logger.js";
import { handleCommand } from "./executor.js";
import type { MessageContext } from "../../twitch/message-handler.js";
import type { CommandContext } from "./executor.js";

function getUserLevel(ctx: MessageContext): string {
  if (ctx.isBroadcaster) return "broadcaster";
  if (ctx.isMod) return "moderator";
  if (ctx.isVip) return "vip";
  if (ctx.isSub) return "subscriber";
  return "everyone";
}

registerHandler("commands", 50, async (ctx) => {
  let channel = ctx.channelId
    ? await prisma.channel.findUnique({ where: { id: ctx.channelId } })
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

  // Build platform-agnostic CommandContext from Twitch MessageContext
  const cmdCtx: CommandContext = {
    channelId: channel.id,
    channel: ctx.channel,
    user: ctx.user,
    userId: ctx.msg.userInfo.userId,
    message: ctx.message,
    userLevel: getUserLevel(ctx),
    platform: "twitch",
    reply: (text: string) => {
      sayInChannel(ctx.channel, text);
      ctx.handled = true;
    },
  };

  await handleCommand(cmdCtx, channel);
});
