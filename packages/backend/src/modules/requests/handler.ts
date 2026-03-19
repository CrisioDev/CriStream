import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { logger } from "../../lib/logger.js";
import { viewerRequestService } from "./service.js";
import type { MessageContext } from "../../twitch/message-handler.js";

registerHandler("requests", 48, async (ctx: MessageContext) => {
  const channel = ctx.channelId
    ? await prisma.channel.findUnique({ where: { id: ctx.channelId } })
    : await prisma.channel.findFirst({
        where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
      });

  if (!channel) return;

  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(`${prefix}gib `)) return;

  const message = ctx.message.slice(prefix.length + 4).trim();
  if (!message) {
    sayInChannel(ctx.channel, `@${ctx.user}, schreib deinen Wunsch nach !gib`);
    ctx.handled = true;
    return;
  }

  if (message.length > 500) {
    sayInChannel(ctx.channel, `@${ctx.user}, zu lang! Max 500 Zeichen.`);
    ctx.handled = true;
    return;
  }

  await viewerRequestService.create(channel.id, ctx.user, message);
  sayInChannel(ctx.channel, `@${ctx.user}, dein Wunsch wurde eingetragen!`);
  ctx.handled = true;

  logger.info({ user: ctx.user, channel: ctx.channel, message }, "Viewer request via chat");
});
