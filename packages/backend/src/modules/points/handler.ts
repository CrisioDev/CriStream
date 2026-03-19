import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { pointsService } from "./service.js";
import { sayInChannel } from "../../twitch/twitch-client.js";

registerHandler("points", 90, async (ctx) => {
  const channel = ctx.msg.channelId
    ? await prisma.channel.findUnique({
        where: { twitchId: ctx.msg.channelId },
        include: { pointsSettings: true },
      })
    : await prisma.channel.findFirst({
        where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
        include: { pointsSettings: true },
      });

  if (!channel?.pointsSettings?.enabled) return;

  // Award message points
  await pointsService.addMessagePoints(
    channel.id,
    ctx.msg.userInfo.userId,
    ctx.user,
    channel.pointsSettings.pointsPerMessage
  );

  // Handle !points built-in command
  if (ctx.message.toLowerCase().startsWith(`${channel.commandPrefix}points`)) {
    const user = await pointsService.getUserPoints(channel.id, ctx.msg.userInfo.userId);
    const points = user?.points ?? 0;
    const watchH = Math.floor((user?.watchMinutes ?? 0) / 60);
    const watchM = (user?.watchMinutes ?? 0) % 60;
    sayInChannel(ctx.channel, `${ctx.user} has ${points} points (Watch time: ${watchH}h ${watchM}m)`);
    ctx.handled = true;
  }
});
