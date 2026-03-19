import type { ChatMessage } from "@twurple/chat";
import { logger } from "../lib/logger.js";
import { emitEvent, emitToChannel } from "../lib/socket.js";
import { incrementChatLines } from "../modules/timers/timer-scheduler.js";
import { prisma } from "../lib/prisma.js";

export interface MessageContext {
  channel: string;
  channelId: string | null;
  user: string;
  message: string;
  msg: ChatMessage;
  badges: Map<string, string>;
  isMod: boolean;
  isBroadcaster: boolean;
  isVip: boolean;
  isSub: boolean;
  handled: boolean;
}

type Handler = (ctx: MessageContext) => Promise<void>;

interface PipelineEntry {
  name: string;
  priority: number;
  handler: Handler;
}

const pipeline: PipelineEntry[] = [];

export function registerHandler(name: string, priority: number, handler: Handler) {
  pipeline.push({ name, priority, handler });
  pipeline.sort((a, b) => a.priority - b.priority);
  logger.info({ name, priority }, "Registered message handler");
}

export async function handleMessage(
  channel: string,
  user: string,
  message: string,
  msg: ChatMessage
) {
  const channelName = channel.replace("#", "");

  // Resolve DB channel early so handlers can use ctx.channelId
  const dbChannel = msg.channelId
    ? await prisma.channel.findUnique({ where: { twitchId: msg.channelId } })
    : await prisma.channel.findFirst({
        where: { displayName: { equals: channelName, mode: "insensitive" } },
      });

  const ctx: MessageContext = {
    channel: channelName,
    channelId: dbChannel?.id ?? null,
    user,
    message,
    msg,
    badges: msg.userInfo.badges,
    isMod: msg.userInfo.isMod,
    isBroadcaster: msg.userInfo.isBroadcaster,
    isVip: msg.userInfo.isVip,
    isSub: msg.userInfo.isSubscriber,
    handled: false,
  };

  // Increment chat line counter for timers
  if (dbChannel) {
    incrementChatLines(dbChannel.id).catch(() => {});
  }

  // Emit chat message to WebSocket clients
  const chatPayload = {
    channelId: dbChannel?.id ?? "",
    channel: ctx.channel,
    user: ctx.user,
    message: ctx.message,
    badges: Object.fromEntries(ctx.badges),
    color: msg.userInfo.color ?? undefined,
    timestamp: Date.now(),
  };

  if (dbChannel) {
    emitToChannel(dbChannel.id, "chat:message", chatPayload);
  } else {
    emitEvent("chat:message", chatPayload);
  }

  // Run pipeline
  for (const entry of pipeline) {
    if (ctx.handled) break;
    try {
      await entry.handler(ctx);
    } catch (err) {
      logger.error({ err, handler: entry.name }, "Message handler error");
    }
  }
}
