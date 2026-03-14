import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { emitEvent } from "../../lib/socket.js";
import { getTwitchApi } from "../../twitch/twitch-api.js";
import { checkLinks } from "./filters/links.js";
import { checkCaps } from "./filters/caps.js";
import { checkSymbols } from "./filters/symbols.js";
import { checkEmotes } from "./filters/emotes.js";
import type { MessageContext } from "../../twitch/message-handler.js";

registerHandler("moderation", 10, async (ctx) => {
  // Skip mods and broadcaster
  if (ctx.isMod || ctx.isBroadcaster) return;

  const channel = await prisma.channel.findFirst({
    where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
    include: { moderationSettings: true },
  });

  if (!channel?.moderationSettings) return;
  const settings = channel.moderationSettings;

  let filterName: string | null = null;
  let duration = 0;

  if (settings.linksEnabled && checkLinks(ctx.message, ctx)) {
    filterName = "links";
    duration = settings.linksTimeoutDuration;
  } else if (settings.capsEnabled && checkCaps(ctx.message, settings.capsMinLength, settings.capsThreshold)) {
    filterName = "caps";
    duration = settings.capsTimeoutDuration;
  } else if (settings.symbolsEnabled && checkSymbols(ctx.message, settings.symbolsThreshold)) {
    filterName = "symbols";
    duration = settings.symbolsTimeoutDuration;
  } else if (settings.emotesEnabled && checkEmotes(ctx.message, settings.emotesMaxCount)) {
    filterName = "emotes";
    duration = settings.emotesTimeoutDuration;
  }

  if (!filterName) return;

  // Execute timeout via Twitch API
  try {
    const api = getTwitchApi();
    const botUser = await api.users.getUserByName(ctx.channel);
    if (botUser) {
      await api.moderation.banUser(botUser.id, {
        user: ctx.msg.userInfo.userId,
        reason: `StreamGuard: ${filterName} filter`,
        duration,
      });
    }
  } catch (err) {
    logger.error({ err, filter: filterName }, "Failed to timeout user");
  }

  // Log the action
  const action = await prisma.moderationAction.create({
    data: {
      channelId: channel.id,
      targetUser: ctx.user,
      filterName,
      action: "timeout",
      duration,
      message: ctx.message,
    },
  });

  emitEvent("moderation:action", {
    id: action.id,
    channelId: channel.id,
    targetUser: ctx.user,
    filterName,
    action: "timeout",
    duration,
    message: ctx.message,
    createdAt: action.createdAt.toISOString(),
  });

  ctx.handled = true;
  logger.info({ user: ctx.user, filter: filterName, channel: ctx.channel }, "Moderation action taken");
});
