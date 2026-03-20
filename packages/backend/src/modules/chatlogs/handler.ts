import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { chatLogService } from "./service.js";

registerHandler("chatlog", 99, async (ctx) => {
  const channel = ctx.msg.channelId
    ? await prisma.channel.findUnique({ where: { twitchId: ctx.msg.channelId } })
    : await prisma.channel.findFirst({
        where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
      });

  if (!channel) return;

  chatLogService.addToBuffer({
    twitchUserId: ctx.msg.userInfo.userId,
    displayName: ctx.user,
    message: ctx.message,
    platform: "twitch",
    channelId: channel.id,
    createdAt: new Date(),
  });

  // Never block other handlers
});
