import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { emitToChannel } from "../../lib/socket.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { logger } from "../../lib/logger.js";
import { pointsService } from "../points/service.js";
import type { MessageContext } from "../../twitch/message-handler.js";
import type { OverlayAlertPayload } from "@streamguard/shared";

registerHandler("soundalerts", 43, async (ctx: MessageContext) => {
  const channel = ctx.channelId
    ? await prisma.channel.findUnique({ where: { id: ctx.channelId } })
    : await prisma.channel.findFirst({
        where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
      });

  if (!channel) return;

  const prefix = channel.commandPrefix;
  if (!ctx.message.startsWith(`${prefix}sound`)) return;

  const parts = ctx.message.slice(prefix.length).split(" ");
  if (parts[0]?.toLowerCase() !== "sound") return;

  const soundName = parts[1]?.toLowerCase();
  if (!soundName) {
    sayInChannel(ctx.channel, `@${ctx.user}, usage: ${prefix}sound <name>`);
    ctx.handled = true;
    return;
  }

  const sound = await prisma.soundAlert.findUnique({
    where: { channelId_name: { channelId: channel.id, name: soundName } },
  });

  if (!sound || !sound.enabled) {
    sayInChannel(ctx.channel, `@${ctx.user}, sound "${soundName}" not found.`);
    ctx.handled = true;
    return;
  }

  // Check cooldown
  if (sound.cooldownSeconds > 0) {
    const cdKey = `cd:${channel.id}:sound:${sound.name}`;
    const set = await redis.set(cdKey, "1", "EX", sound.cooldownSeconds, "NX");
    if (!set) {
      sayInChannel(ctx.channel, `@${ctx.user}, that sound is on cooldown.`);
      ctx.handled = true;
      return;
    }
  }

  // Check and deduct points
  if (sound.pointsCost > 0) {
    const userPoints = await pointsService.getUserPoints(channel.id, ctx.msg.userInfo.userId);
    if (!userPoints || userPoints.points < sound.pointsCost) {
      sayInChannel(
        ctx.channel,
        `@${ctx.user}, you need ${sound.pointsCost} points (you have ${userPoints?.points ?? 0}).`
      );
      ctx.handled = true;
      return;
    }

    await pointsService.deductPoints(channel.id, ctx.msg.userInfo.userId, sound.pointsCost);
  }

  // Load alert settings for "sound" type
  const alertSettings = await prisma.alertSettings.findUnique({
    where: { channelId_alertType: { channelId: channel.id, alertType: "sound" } },
  });

  const soundVolume = (sound as any).volume ?? 80;

  const payload: OverlayAlertPayload = {
    alertType: "sound",
    text: (alertSettings?.textTemplate ?? "{user} played {sound}!")
      .replace(/\{user\}/g, ctx.user)
      .replace(/\{sound\}/g, sound.name),
    duration: alertSettings?.duration ?? 5,
    animationType: (alertSettings?.animationType ?? "fade") as any,
    soundUrl: sound.fileUrl,
    imageUrl: alertSettings?.imageFileUrl ?? "",
    volume: soundVolume,
  };

  emitToChannel(channel.id, "alert:trigger", { channelId: channel.id, payload });
  emitToChannel(channel.id, "sound:play", {
    channelId: channel.id,
    soundUrl: sound.fileUrl,
    volume: soundVolume,
  });

  sayInChannel(ctx.channel, `@${ctx.user} played sound: ${sound.name}`);
  ctx.handled = true;

  logger.info({ user: ctx.user, sound: sound.name, channel: ctx.channel }, "Sound alert played");
});
