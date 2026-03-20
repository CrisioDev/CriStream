import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import { CUSTOM_API_TIMEOUT_MS, CUSTOM_API_CACHE_TTL, CUSTOM_API_MAX_RESPONSE_LENGTH } from "@cristream/shared";

export interface BaseContext {
  channel: string;
  user: string;
  userId: string;
  message: string;
}

type VariableResolver = (args: string[], ctx: BaseContext) => string | Promise<string>;

const variables = new Map<string, VariableResolver>();

export function registerVariable(name: string, resolver: VariableResolver) {
  variables.set(name, resolver);
}

// ── Helper: get channel + user from DB ──
async function getChannelUser(ctx: BaseContext) {
  const channel = await prisma.channel.findFirst({
    where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
  });
  if (!channel) return { channel: null, channelUser: null };
  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: ctx.userId } },
  });
  return { channel, channelUser };
}

// ── Built-in variables ──

registerVariable("user", (_args, ctx) => ctx.user);
registerVariable("channel", (_args, ctx) => ctx.channel);
registerVariable("query", (_args, ctx) => {
  const parts = ctx.message.split(" ");
  return parts.slice(1).join(" ") || "";
});
registerVariable("touser", (_args, ctx) => {
  const parts = ctx.message.split(" ");
  return parts[1]?.replace("@", "") || ctx.user;
});
registerVariable("count", () => "{count}"); // replaced by command handler with useCount
registerVariable("time", () => new Date().toLocaleTimeString("de-DE"));
registerVariable("date", () => new Date().toLocaleDateString("de-DE"));
registerVariable("random", (args) => {
  const max = parseInt(args[0] ?? "100", 10);
  return String(Math.floor(Math.random() * max) + 1);
});
registerVariable("uptime", () => {
  const seconds = Math.floor(process.uptime());
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
});

// ── User data variables ──

registerVariable("points", async (_args, ctx) => {
  const { channelUser } = await getChannelUser(ctx);
  return String(channelUser?.points ?? 0);
});

registerVariable("watchtime", async (_args, ctx) => {
  const { channelUser } = await getChannelUser(ctx);
  const mins = channelUser?.watchMinutes ?? 0;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
});

registerVariable("watchminutes", async (_args, ctx) => {
  const { channelUser } = await getChannelUser(ctx);
  return String(channelUser?.watchMinutes ?? 0);
});

registerVariable("lastseen", async (_args, ctx) => {
  const { channelUser } = await getChannelUser(ctx);
  if (!channelUser) return "nie";
  return channelUser.lastSeen.toLocaleDateString("de-DE");
});

registerVariable("rank", async (_args, ctx) => {
  const { channel, channelUser } = await getChannelUser(ctx);
  if (!channel || !channelUser) return "?";
  const above = await prisma.channelUser.count({
    where: { channelId: channel.id, points: { gt: channelUser.points } },
  });
  return String(above + 1);
});

registerVariable("chatters", async (_args, ctx) => {
  const channel = await prisma.channel.findFirst({
    where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
  });
  if (!channel) return "0";
  const count = await prisma.channelUser.count({ where: { channelId: channel.id } });
  return String(count);
});

registerVariable("commands", async (_args, ctx) => {
  const channel = await prisma.channel.findFirst({
    where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
  });
  if (!channel) return "0";
  const count = await prisma.command.count({ where: { channelId: channel.id, enabled: true } });
  return String(count);
});

// Individual arguments: $(1), $(2), $(3) etc.
for (let i = 1; i <= 10; i++) {
  registerVariable(String(i), (_args, ctx) => {
    const parts = ctx.message.split(" ");
    return parts[i] ?? "";
  });
}

// ── Twitch API variables (cached) ──

registerVariable("game", async (_args, ctx) => {
  const cacheKey = `var:game:${ctx.channel.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  try {
    const channel = await prisma.channel.findFirst({
      where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
    });
    if (!channel) return "";
    const { getTwitchApi } = await import("../../twitch/twitch-api.js");
    const api = getTwitchApi();
    const stream = await api.streams.getStreamByUserId(channel.twitchId);
    const game = stream?.gameName ?? "";
    await redis.set(cacheKey, game, "EX", 60);
    return game;
  } catch {
    return "";
  }
});

registerVariable("title", async (_args, ctx) => {
  const cacheKey = `var:title:${ctx.channel.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  try {
    const channel = await prisma.channel.findFirst({
      where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
    });
    if (!channel) return "";
    const { getTwitchApi } = await import("../../twitch/twitch-api.js");
    const api = getTwitchApi();
    const ch = await api.channels.getChannelInfoById(channel.twitchId);
    const title = ch?.title ?? "";
    await redis.set(cacheKey, title, "EX", 60);
    return title;
  } catch {
    return "";
  }
});

registerVariable("viewers", async (_args, ctx) => {
  const cacheKey = `var:viewers:${ctx.channel.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  try {
    const channel = await prisma.channel.findFirst({
      where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
    });
    if (!channel) return "0";
    const { getTwitchApi } = await import("../../twitch/twitch-api.js");
    const api = getTwitchApi();
    const stream = await api.streams.getStreamByUserId(channel.twitchId);
    const count = String(stream?.viewers ?? 0);
    await redis.set(cacheKey, count, "EX", 30);
    return count;
  } catch {
    return "0";
  }
});

registerVariable("followers", async (_args, ctx) => {
  const cacheKey = `var:followers:${ctx.channel.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  try {
    const channel = await prisma.channel.findFirst({
      where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
    });
    if (!channel) return "0";
    const { getTwitchApi } = await import("../../twitch/twitch-api.js");
    const api = getTwitchApi();
    const result = await api.channels.getChannelFollowerCount(channel.twitchId);
    const count = String(result ?? 0);
    await redis.set(cacheKey, count, "EX", 300);
    return count;
  } catch {
    return "0";
  }
});

// ── Custom API fetch with caching ──

async function fetchCustomApi(url: string): Promise<string> {
  const hash = createHash("md5").update(url).digest("hex");
  const cacheKey = `customapi:${hash}`;

  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CUSTOM_API_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CriStream Bot/2.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) return `[API Error: ${response.status}]`;

    let text = await response.text();
    if (text.length > CUSTOM_API_MAX_RESPONSE_LENGTH) {
      text = text.slice(0, CUSTOM_API_MAX_RESPONSE_LENGTH) + "...";
    }

    text = text.replace(/[\r\n]+/g, " ").trim();
    await redis.set(cacheKey, text, "EX", CUSTOM_API_CACHE_TTL);
    return text;
  } catch (err: any) {
    logger.error({ err, url }, "Custom API fetch failed");
    if (err.name === "AbortError") return "[API Timeout]";
    return "[API Error]";
  }
}

export async function parseVariables(template: string, ctx: BaseContext): Promise<string> {
  let result = template;

  // Handle $(customapi.URL) and $(urlfetch.URL) first
  const apiRegex = /\$\((customapi|urlfetch)\.(https?:\/\/[^)]+)\)/gi;
  const apiMatches = [...template.matchAll(apiRegex)];

  for (const match of apiMatches) {
    const [full, , url] = match;
    const value = await fetchCustomApi(url!);
    result = result.replace(full!, value);
  }

  // Then handle standard $(name) or $(name.arg) variables
  const regex = /\$\((\w+)(?:\.(\w+))?\)/g;
  const matches = [...result.matchAll(regex)];

  for (const match of matches) {
    const [full, name, arg] = match;
    const resolver = variables.get(name!);
    if (resolver) {
      const args = arg ? [arg] : [];
      const value = await resolver(args, ctx);
      result = result.replace(full!, value);
    }
  }

  return result;
}
