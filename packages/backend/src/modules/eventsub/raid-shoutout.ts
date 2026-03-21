import { getTwitchApi } from "../../twitch/twitch-api.js";
import { emitToChannel } from "../../lib/socket.js";
import { logger } from "../../lib/logger.js";
import type { OverlayAlertPayload } from "@cristream/shared";

interface ChannelRecord {
  id: string;
  twitchId: string;
  displayName: string;
}

export async function handleRaidShoutout(
  channel: ChannelRecord,
  event: Record<string, any>
): Promise<void> {
  const raiderUserId = event.from_broadcaster_user_id;
  const raiderName = event.from_broadcaster_user_name ?? "unknown";

  if (!raiderUserId) return;

  const api = getTwitchApi();

  // 1. Auto-shoutout via Twitch API
  try {
    await api.chat.shoutoutUser(channel.twitchId, raiderUserId);
    logger.info({ channelId: channel.id, raider: raiderName }, "Auto-shoutout sent");
  } catch (err: any) {
    // 429 = already shouted out recently, that's fine
    if (!err?.statusCode || err.statusCode !== 429) {
      logger.error({ err, raider: raiderName }, "Failed to send shoutout");
    }
  }

  // 2. Fetch best clip from raider (last 2 months, most viewed)
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const clips = await api.clips.getClipsForBroadcaster(raiderUserId, {
      startDate: twoMonthsAgo.toISOString(),
      limit: 20,
    });

    const clipList = clips.data;
    if (!clipList || clipList.length === 0) {
      logger.debug({ raider: raiderName }, "No clips found for raider");
      return;
    }

    // Sort by view count descending, pick the top one
    const bestClip = clipList.sort((a, b) => b.views - a.views)[0]!;

    // Build clip embed URL for the overlay
    const clipEmbedUrl = bestClip.embedUrl + "&parent=localhost&autoplay=true&muted=false";
    const clipThumbnailUrl = bestClip.thumbnailUrl;

    // Emit a special raid clip alert to the overlay
    const payload: OverlayAlertPayload = {
      alertType: "raid",
      text: `${raiderName} raided! Check out this clip:`,
      duration: Math.min(Math.ceil(bestClip.duration) + 3, 60),
      animationType: "fade",
      soundUrl: "",
      imageUrl: clipThumbnailUrl,
      volume: 80,
      clipUrl: clipEmbedUrl,
      clipTitle: bestClip.title,
      clipDuration: bestClip.duration,
      clipViews: bestClip.views,
      clipCreator: bestClip.creatorDisplayName,
    };

    emitToChannel(channel.id, "alert:trigger", { channelId: channel.id, payload });
    logger.info(
      { channelId: channel.id, raider: raiderName, clip: bestClip.title, views: bestClip.views },
      "Raid clip alert triggered"
    );
  } catch (err) {
    logger.error({ err, raider: raiderName }, "Failed to fetch raider clips");
  }
}
