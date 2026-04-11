import { ChatClient } from "@twurple/chat";
import { getAuthProvider, addUserToAuthProvider } from "./twitch-auth.js";
import { handleMessage } from "./message-handler.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { emitEvent } from "../lib/socket.js";

// Import handlers to register them (priority order: spam=5, moderation=10, soundalerts=43, songrequests=45, commands=50, points=90, chatlog=99)
import "../modules/moderation/spam-handler.js";
import "../modules/moderation/handler.js";
import "../modules/lootbox/title-handler.js";
import "../modules/gambling/handler.js";
import "../modules/autoresponse/handler.js";
import "../modules/lootbox/handler.js";
import "../modules/alerts/sound-handler.js";
import "../modules/songrequests/handler.js";
import "../modules/requests/handler.js";
import "../modules/counters/handler.js";
import "../modules/commands/handler.js";
import "../modules/points/handler.js";
import "../modules/chatlogs/handler.js";

let chatClient: ChatClient | null = null;
let lastActivityTime = Date.now();
let watchdogInterval: ReturnType<typeof setInterval> | null = null;

// How long without activity before we consider the connection dead
const WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WATCHDOG_CHECK_INTERVAL_MS = 60 * 1000; // check every minute

function markActivity() {
  lastActivityTime = Date.now();
}

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
    markActivity();
    await handleMessage(channel, user, message, msg);
  });

  chatClient.onConnect(async () => {
    markActivity();
    logger.info("Twitch chat connected");

    // Re-join all botJoined channels every time we connect.
    // chatClient.reconnect() does NOT preserve channel JOINs — if we don't
    // rejoin here the bot sits on an empty connection and receives zero messages
    // until the next watchdog-forced reconnect. That's how sound commands break.
    try {
      const channels = await prisma.channel.findMany({ where: { botJoined: true } });
      for (const ch of channels) {
        try {
          await chatClient!.join(ch.displayName.toLowerCase());
          logger.info({ channel: ch.displayName }, "Joined channel");
        } catch (err) {
          logger.error({ err, channel: ch.displayName }, "Failed to join channel");
        }
      }
    } catch (err) {
      logger.error({ err }, "Failed to enumerate channels on connect");
    }

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

  // Start connection watchdog
  startWatchdog();
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

function startWatchdog() {
  if (watchdogInterval) clearInterval(watchdogInterval);

  watchdogInterval = setInterval(async () => {
    if (!chatClient) return;

    const silentMs = Date.now() - lastActivityTime;

    if (silentMs > WATCHDOG_TIMEOUT_MS) {
      logger.warn(
        { silentMs, isConnected: chatClient.isConnected },
        "Twitch chat watchdog: no activity detected, forcing full reconnect"
      );

      // Full reconnect: quit + connect. The onConnect handler re-joins channels.
      // We reset activity to a partial value so the watchdog doesn't hammer
      // reconnects, but won't stay silent forever if messages don't return.
      try {
        chatClient.quit();
      } catch (err) {
        logger.error({ err }, "Watchdog: quit() failed");
      }
      try {
        chatClient.connect();
        // Give the connection + rejoins ~3 minutes grace period before next check
        lastActivityTime = Date.now() - (WATCHDOG_TIMEOUT_MS - 3 * 60 * 1000);
      } catch (err) {
        logger.error({ err }, "Watchdog: connect() failed");
      }
    }
  }, WATCHDOG_CHECK_INTERVAL_MS);
}
