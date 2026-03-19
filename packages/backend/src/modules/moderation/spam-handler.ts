import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { emitToChannel } from "../../lib/socket.js";
import { getTwitchApi } from "../../twitch/twitch-api.js";
import { checkSpam } from "./filters/spam.js";
import { checkBannedWords } from "./filters/banned-words.js";

registerHandler("spam", 5, async (ctx) => {
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

  // Check spam
  if (settings.spamEnabled) {
    const isSpam = await checkSpam(
      channel.id,
      ctx.msg.userInfo.userId,
      ctx.message,
      settings.spamMaxRepeat,
      settings.spamWindowSeconds
    );
    if (isSpam) {
      filterName = "spam";
      duration = settings.spamTimeoutDuration;
    }
  }

  // Check banned words
  if (!filterName && settings.bannedWordsEnabled) {
    const hasBannedWord = await checkBannedWords(channel.id, ctx.message);
    if (hasBannedWord) {
      filterName = "banned_words";
      duration = settings.bannedWordsTimeoutDuration;
    }
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

  emitToChannel(channel.id, "moderation:action", {
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
  logger.info({ user: ctx.user, filter: filterName, channel: ctx.channel }, "Spam/BannedWord action taken");
});
