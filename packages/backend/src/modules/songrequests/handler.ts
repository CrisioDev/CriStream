import { randomUUID } from "node:crypto";
import { registerHandler } from "../../twitch/message-handler.js";
import { prisma } from "../../lib/prisma.js";
import { sayInChannel } from "../../twitch/twitch-client.js";
import { songRequestService } from "./service.js";
import type { SongRequestDto } from "@streamguard/shared";

registerHandler("songrequests", 45, async (ctx) => {
  const channel = ctx.msg.channelId
    ? await prisma.channel.findUnique({
        where: { twitchId: ctx.msg.channelId },
        include: { songRequestSettings: true },
      })
    : await prisma.channel.findFirst({
        where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
        include: { songRequestSettings: true },
      });

  if (!channel?.songRequestSettings?.enabled) return;

  const prefix = channel.commandPrefix;
  const msg = ctx.message;

  if (!msg.startsWith(prefix)) return;

  const parts = msg.slice(prefix.length).split(" ");
  const cmd = parts[0]!.toLowerCase();
  const args = parts.slice(1).join(" ").trim();

  switch (cmd) {
    case "sr": {
      if (!args) {
        sayInChannel(ctx.channel, `@${ctx.user}, usage: ${prefix}sr <song title or YouTube URL>`);
        ctx.handled = true;
        return;
      }

      // Check cooldown
      const canRequest = await songRequestService.checkCooldown(channel.id, ctx.msg.userInfo.userId);
      if (!canRequest) {
        sayInChannel(ctx.channel, `@${ctx.user}, you're on cooldown. Please wait before requesting another song.`);
        ctx.handled = true;
        return;
      }

      const parsed = songRequestService.parseYouTubeUrl(args);
      if (!parsed) {
        sayInChannel(ctx.channel, `@${ctx.user}, invalid song request.`);
        ctx.handled = true;
        return;
      }

      const request: SongRequestDto = {
        id: randomUUID(),
        title: parsed.title,
        url: parsed.videoId ? `https://youtu.be/${parsed.videoId}` : "",
        duration: 0,
        requestedBy: ctx.user,
        requestedAt: Date.now(),
      };

      const added = await songRequestService.addToQueue(channel.id, request);
      if (!added) {
        sayInChannel(ctx.channel, `@${ctx.user}, the song request queue is full.`);
      } else {
        sayInChannel(ctx.channel, `@${ctx.user}, "${parsed.title}" has been added to the queue.`);
      }
      ctx.handled = true;
      break;
    }

    case "skip": {
      if (!ctx.isMod && !ctx.isBroadcaster) {
        sayInChannel(ctx.channel, `@${ctx.user}, only moderators can skip songs.`);
        ctx.handled = true;
        return;
      }
      const skipped = await songRequestService.skip(channel.id);
      if (skipped) {
        sayInChannel(ctx.channel, `Skipped: "${skipped.title}" (requested by ${skipped.requestedBy})`);
      } else {
        sayInChannel(ctx.channel, "No songs in the queue to skip.");
      }
      ctx.handled = true;
      break;
    }

    case "queue": {
      const queue = await songRequestService.getQueue(channel.id);
      if (queue.length === 0) {
        sayInChannel(ctx.channel, "The song request queue is empty.");
      } else {
        const list = queue
          .slice(0, 5)
          .map((s, i) => `${i + 1}. ${s.title} (${s.requestedBy})`)
          .join(" | ");
        sayInChannel(ctx.channel, `Queue (${queue.length}): ${list}`);
      }
      ctx.handled = true;
      break;
    }

    case "currentsong": {
      const current = await songRequestService.getCurrentSong(channel.id);
      if (current) {
        sayInChannel(ctx.channel, `Now playing: "${current.title}" (requested by ${current.requestedBy})`);
      } else {
        sayInChannel(ctx.channel, "No song is currently playing.");
      }
      ctx.handled = true;
      break;
    }
  }
});
