import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import type { SceneData } from "./scenes-html.js";

const DEFAULTS = {
  handle: "",
  twitchHandle: "",
  youtubeHandle: "",
  discordHandle: "",
  instagramHandle: "",
  brbNote: "Bin gleich zurück.",
  startingToday: "Heute live",
  defaultGame: "",
  defaultMode: "",
  streamPlan: [] as Array<{ day: string; time: string; title: string }>,
};

/**
 * Loads SceneSettings for a channel, creating a row with defaults on first
 * access. Returns the shape SceneData consumers (HTML generators, frontend)
 * expect, so the streamPlan Json field is parsed.
 */
export async function getSceneData(channelId: string): Promise<SceneData> {
  let row = await prisma.sceneSettings.findUnique({ where: { channelId } });
  if (!row) {
    row = await prisma.sceneSettings.create({ data: { channelId } });
  }
  return {
    handle: row.handle,
    twitchHandle: row.twitchHandle,
    youtubeHandle: row.youtubeHandle,
    discordHandle: row.discordHandle,
    instagramHandle: row.instagramHandle,
    brbNote: row.brbNote,
    startingToday: row.startingToday,
    defaultGame: row.defaultGame,
    defaultMode: row.defaultMode,
    streamPlan: normalizePlan(row.streamPlan),
  };
}

export async function updateSceneSettings(
  channelId: string,
  patch: Partial<SceneData>,
): Promise<SceneData> {
  // Ensure the row exists before we patch — first call creates with defaults.
  await prisma.sceneSettings.upsert({
    where: { channelId },
    update: {},
    create: { channelId, ...DEFAULTS },
  });
  const data: Record<string, unknown> = {};
  if (patch.handle !== undefined) data.handle = patch.handle;
  if (patch.twitchHandle !== undefined) data.twitchHandle = patch.twitchHandle;
  if (patch.youtubeHandle !== undefined) data.youtubeHandle = patch.youtubeHandle;
  if (patch.discordHandle !== undefined) data.discordHandle = patch.discordHandle;
  if (patch.instagramHandle !== undefined) data.instagramHandle = patch.instagramHandle;
  if (patch.brbNote !== undefined) data.brbNote = patch.brbNote;
  if (patch.startingToday !== undefined) data.startingToday = patch.startingToday;
  if (patch.defaultGame !== undefined) data.defaultGame = patch.defaultGame;
  if (patch.defaultMode !== undefined) data.defaultMode = patch.defaultMode;
  if (patch.streamPlan !== undefined) data.streamPlan = normalizePlan(patch.streamPlan);
  await prisma.sceneSettings.update({ where: { channelId }, data });
  return getSceneData(channelId);
}

export interface LiveTwitchState {
  game: string;
  title: string;
  viewers: number;
  live: boolean;
}

/**
 * Live Twitch state for a channel — game category, stream title, viewers.
 * 60s Redis cache so a scene that polls every 30s doesn't hammer Helix.
 * Returns empty values + live:false when offline or on any API failure;
 * scenes will keep showing the DB-default values in that case.
 */
export async function getLiveTwitchState(channelTwitchId: string): Promise<LiveTwitchState> {
  const cacheKey = `scene:state:${channelTwitchId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as LiveTwitchState;
    } catch {
      // Fall through and refetch on parse error.
    }
  }

  const empty: LiveTwitchState = { game: "", title: "", viewers: 0, live: false };
  try {
    const { getTwitchApi } = await import("../../twitch/twitch-api.js");
    const api = getTwitchApi();
    const [stream, channelInfo] = await Promise.all([
      api.streams.getStreamByUserId(channelTwitchId).catch(() => null),
      api.channels.getChannelInfoById(channelTwitchId).catch(() => null),
    ]);
    const state: LiveTwitchState = {
      // Prefer live stream's gameName (= category currently played); fall back
      // to channelInfo's stored category for the offline case.
      game: stream?.gameName ?? channelInfo?.gameName ?? "",
      title: stream?.title ?? channelInfo?.title ?? "",
      viewers: stream?.viewers ?? 0,
      live: !!stream,
    };
    await redis.set(cacheKey, JSON.stringify(state), "EX", 60);
    return state;
  } catch (err) {
    logger.warn({ err, channelTwitchId }, "getLiveTwitchState failed");
    return empty;
  }
}

function normalizePlan(raw: unknown): Array<{ day: string; time: string; title: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      if (typeof r !== "object" || r === null) return null;
      const o = r as Record<string, unknown>;
      return {
        day: String(o.day ?? ""),
        time: String(o.time ?? ""),
        title: String(o.title ?? ""),
      };
    })
    .filter((r): r is { day: string; time: string; title: string } => r !== null);
}
