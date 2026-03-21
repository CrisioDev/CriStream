import { prisma } from "../../lib/prisma.js";
import { emitToChannel } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";

export async function processEvent(type: string, event: any): Promise<void> {
  // Determine the channel by broadcaster_user_id or to_broadcaster_user_id
  const twitchId =
    event.broadcaster_user_id ?? event.to_broadcaster_user_id;

  if (!twitchId) {
    logger.warn({ type }, "EventSub event has no broadcaster_user_id");
    return;
  }

  const channel = await prisma.channel.findUnique({
    where: { twitchId },
  });

  if (!channel) {
    logger.warn({ twitchId, type }, "No channel found for EventSub event");
    return;
  }

  // Save to EventLog
  await prisma.eventLog.create({
    data: {
      channelId: channel.id,
      eventType: type,
      data: event,
    },
  });

  // Emit typed WebSocket events
  switch (type) {
    case "channel.follow":
      emitToChannel(channel.id, "eventsub:follow", {
        channelId: channel.id,
        user: event.user_name ?? event.user_login ?? "unknown",
      });
      break;

    case "channel.subscribe":
      emitToChannel(channel.id, "eventsub:sub", {
        channelId: channel.id,
        user: event.user_name ?? event.user_login ?? "unknown",
        tier: event.tier ?? "1000",
      });
      break;

    case "channel.subscription.gift":
      emitToChannel(channel.id, "eventsub:giftsub", {
        channelId: channel.id,
        user: event.user_name ?? event.user_login ?? "anonymous",
        amount: event.total ?? 1,
        tier: event.tier ?? "1000",
      });
      break;

    case "channel.raid":
      emitToChannel(channel.id, "eventsub:raid", {
        channelId: channel.id,
        fromUser: event.from_broadcaster_user_name ?? "unknown",
        viewers: event.viewers ?? 0,
      });

      // Auto-shoutout + clip alert for raider
      try {
        const { handleRaidShoutout } = await import("./raid-shoutout.js");
        handleRaidShoutout(channel, event).catch((err: unknown) => {
          logger.error({ err }, "Raid shoutout/clip failed");
        });
      } catch {
        // raid-shoutout not available
      }
      break;

    case "channel.hype_train.begin":
      emitToChannel(channel.id, "eventsub:hypetrain", {
        channelId: channel.id,
        level: event.level ?? 1,
      });
      break;

    case "channel.channel_points_custom_reward_redemption.add": {
      const userName = event.user_name ?? event.user_login ?? "unknown";
      const rewardTitle = event.reward?.title ?? "";
      const userInput = event.user_input ?? "";
      const twitchRewardId = event.reward?.id ?? "";

      emitToChannel(channel.id, "eventsub:redemption", {
        channelId: channel.id,
        user: userName,
        rewardTitle,
        userInput,
      });

      // Execute channel point reward actions
      try {
        const { channelPointService } = await import("../channelpoints/service.js");
        const { executeRewardActions } = await import("../channelpoints/action-executor.js");
        const reward = await channelPointService.findByReward(channel.id, twitchRewardId, rewardTitle);
        if (reward && reward.enabled && reward.actionConfig.length > 0) {
          await executeRewardActions(
            channel.id,
            channel.displayName,
            userName,
            userInput,
            rewardTitle,
            reward.actionConfig
          );
        }
      } catch (err) {
        logger.error({ err, type }, "Failed to execute channel point reward actions");
      }
      break;
    }

    case "stream.online": {
      try {
        const { onStreamOnline } = await import("../summaries/summary-scheduler.js");
        await onStreamOnline(channel.id);
      } catch (err) {
        logger.error({ err }, "Failed to handle stream.online");
      }
      break;
    }

    case "stream.offline": {
      try {
        const { onStreamOffline } = await import("../summaries/summary-scheduler.js");
        await onStreamOffline(channel.id);
      } catch (err) {
        logger.error({ err }, "Failed to handle stream.offline");
      }
      break;
    }

    case "channel.poll.begin":
    case "channel.poll.progress":
    case "channel.poll.end": {
      const choices = (event.choices ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        votes: (c.votes ?? 0) + (c.channel_points_votes ?? 0) + (c.bits_votes ?? 0),
        channelPointsVotes: c.channel_points_votes ?? 0,
      }));
      const totalVotes = choices.reduce((sum: number, c: any) => sum + c.votes, 0);
      const status = type === "channel.poll.end" ? "ended" : "active";
      emitToChannel(channel.id, "poll:update", {
        channelId: channel.id,
        status,
        pollId: event.id,
        title: event.title,
        choices,
        totalVotes,
        endsAt: event.ends_at ?? null,
        endedAt: event.ended_at ?? null,
      });
      break;
    }

    case "channel.prediction.begin":
    case "channel.prediction.progress":
    case "channel.prediction.lock":
    case "channel.prediction.end": {
      const outcomes = (event.outcomes ?? []).map((o: any) => ({
        id: o.id,
        title: o.title,
        color: o.color ?? "BLUE",
        users: o.users ?? 0,
        channelPoints: o.channel_points ?? 0,
      }));
      let status: "active" | "locked" | "ended" = "active";
      if (type === "channel.prediction.lock") status = "locked";
      else if (type === "channel.prediction.end") status = "ended";
      emitToChannel(channel.id, "prediction:update", {
        channelId: channel.id,
        status,
        predictionId: event.id,
        title: event.title,
        outcomes,
        locksAt: event.locks_at ?? null,
        winningOutcomeId: event.winning_outcome_id ?? null,
      });
      break;
    }

    default:
      logger.debug({ type }, "Unhandled EventSub event type");
  }

  // Trigger alert pipeline
  try {
    const { processAlertEvent } = await import("../alerts/alert-pipeline.js");
    await processAlertEvent(channel.id, type, event);
  } catch (err) {
    logger.error({ err, type }, "Failed to process alert for event");
  }

  // Send Discord notification (fire-and-forget)
  try {
    const { notifyDiscordEvent } = await import("../../discord/event-notifier.js");
    notifyDiscordEvent(channel.id, type, event).catch((err: unknown) => {
      logger.error({ err, type }, "Failed to send Discord notification");
    });
  } catch {
    // Discord notifier not available
  }
}
