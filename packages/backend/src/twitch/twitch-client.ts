import { ChatClient } from "@twurple/chat";
import { getAuthProvider, addUserToAuthProvider } from "./twitch-auth.js";
import { handleMessage } from "./message-handler.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { emitEvent } from "../lib/socket.js";

// Import handlers to register them
import "../modules/moderation/handler.js";
import "../modules/commands/handler.js";

let chatClient: ChatClient | null = null;

export interface TwitchClientInfo {
  isConnected: boolean;
  currentChannels: string[];
}

export function getTwitchClient(): TwitchClientInfo {
  return {
    isConnected: chatClient?.isConnected ?? false,
    currentChannels: chatClient?.currentChannels?.map((c) => c.replace("#", "")) ?? [],
  };
}

export async function initTwitchClient(): Promise<void> {
  // Find first user with tokens (bot account)
  const botUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!botUser) {
    logger.warn("No bot user found - Twitch client not started");
    return;
  }

  await addUserToAuthProvider(botUser.twitchId);

  chatClient = new ChatClient({
    authProvider: getAuthProvider(),
    authIntents: [botUser.twitchId],
    channels: [],
  });

  chatClient.onMessage(async (channel, user, message, msg) => {
    await handleMessage(channel, user, message, msg);
  });

  chatClient.onConnect(() => {
    logger.info("Twitch chat connected");
    emitEvent("bot:status", {
      connected: true,
      channels: chatClient?.currentChannels?.map((c) => c.replace("#", "")) ?? [],
    });
  });

  chatClient.onDisconnect(() => {
    logger.warn("Twitch chat disconnected");
    emitEvent("bot:status", { connected: false, channels: [] });
  });

  chatClient.connect();

  // Join channels that have botJoined = true
  const channels = await prisma.channel.findMany({ where: { botJoined: true } });
  for (const ch of channels) {
    try {
      await chatClient.join(ch.displayName.toLowerCase());
      logger.info({ channel: ch.displayName }, "Joined channel");
    } catch (err) {
      logger.error({ err, channel: ch.displayName }, "Failed to join channel");
    }
  }
}

export async function joinChannel(channelName: string): Promise<void> {
  if (!chatClient) throw new Error("Chat client not initialized");
  await chatClient.join(channelName.toLowerCase());
}

export async function leaveChannel(channelName: string): Promise<void> {
  if (!chatClient) throw new Error("Chat client not initialized");
  chatClient.part(channelName.toLowerCase());
}

export function sayInChannel(channel: string, message: string): void {
  if (!chatClient) throw new Error("Chat client not initialized");
  chatClient.say(channel.toLowerCase(), message);
}
