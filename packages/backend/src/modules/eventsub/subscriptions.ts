import { config } from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

interface EventSubSubscription {
  type: string;
  version: string;
  condition: Record<string, string>;
}

const SUBSCRIPTION_TYPES: EventSubSubscription[] = [
  { type: "channel.follow", version: "2", condition: {} },
  { type: "channel.subscribe", version: "1", condition: {} },
  { type: "channel.subscription.gift", version: "1", condition: {} },
  { type: "channel.raid", version: "1", condition: {} },
  { type: "channel.hype_train.begin", version: "1", condition: {} },
  { type: "channel.channel_points_custom_reward_redemption.add", version: "1", condition: {} },
  { type: "stream.online", version: "1", condition: {} },
  { type: "stream.offline", version: "1", condition: {} },
  { type: "channel.poll.begin", version: "1", condition: {} },
  { type: "channel.poll.progress", version: "1", condition: {} },
  { type: "channel.poll.end", version: "1", condition: {} },
  { type: "channel.prediction.begin", version: "1", condition: {} },
  { type: "channel.prediction.progress", version: "1", condition: {} },
  { type: "channel.prediction.lock", version: "1", condition: {} },
  { type: "channel.prediction.end", version: "1", condition: {} },
];

async function getAppAccessToken(): Promise<string> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: "client_credentials",
    }),
  });
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function subscribeToEvents(channelId: string): Promise<void> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    include: { owner: true },
  });

  const accessToken = await getAppAccessToken();

  for (const sub of SUBSCRIPTION_TYPES) {
    const condition: Record<string, string> = {};

    if (sub.type === "channel.raid") {
      condition.to_broadcaster_user_id = channel.twitchId;
    } else if (sub.type === "channel.follow") {
      condition.broadcaster_user_id = channel.twitchId;
      condition.moderator_user_id = channel.twitchId;
    } else {
      condition.broadcaster_user_id = channel.twitchId;
    }

    try {
      const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": config.twitchClientId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: sub.type,
          version: sub.version,
          condition,
          transport: {
            method: "webhook",
            callback: config.eventsubCallbackUrl,
            secret: config.eventsubSecret,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        logger.warn({ type: sub.type, status: res.status, err }, "Failed to create EventSub subscription");
      } else {
        logger.info({ type: sub.type, channelId }, "EventSub subscription created");
      }
    } catch (err) {
      logger.error({ err, type: sub.type }, "Error creating EventSub subscription");
    }
  }
}

export async function unsubscribeAll(channelId: string): Promise<void> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return;

  const accessToken = await getAppAccessToken();

  // List all subscriptions
  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": config.twitchClientId,
    },
  });

  if (!res.ok) return;

  const data = (await res.json()) as { data: Array<{ id: string; condition: Record<string, string> }> };

  for (const sub of data.data) {
    const hasBroadcaster =
      sub.condition.broadcaster_user_id === channel.twitchId ||
      sub.condition.to_broadcaster_user_id === channel.twitchId;

    if (hasBroadcaster) {
      await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${sub.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": config.twitchClientId,
        },
      });
    }
  }
}
