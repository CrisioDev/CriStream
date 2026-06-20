import { prisma } from "../../lib/prisma.js";
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
