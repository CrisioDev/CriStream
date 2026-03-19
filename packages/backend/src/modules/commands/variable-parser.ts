import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { logger } from "../../lib/logger.js";
import { CUSTOM_API_TIMEOUT_MS, CUSTOM_API_CACHE_TTL, CUSTOM_API_MAX_RESPONSE_LENGTH } from "@streamguard/shared";

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

// Built-in variables
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
registerVariable("points", async (_args, ctx) => {
  const channel = await prisma.channel.findFirst({
    where: { displayName: { equals: ctx.channel, mode: "insensitive" } },
  });
  if (!channel) return "0";
  const user = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: ctx.userId } },
  });
  return String(user?.points ?? 0);
});

// ── Custom API fetch with caching ──

async function fetchCustomApi(url: string): Promise<string> {
  const hash = createHash("md5").update(url).digest("hex");
  const cacheKey = `customapi:${hash}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CUSTOM_API_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "StreamGuard Bot/2.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) return `[API Error: ${response.status}]`;

    let text = await response.text();
    if (text.length > CUSTOM_API_MAX_RESPONSE_LENGTH) {
      text = text.slice(0, CUSTOM_API_MAX_RESPONSE_LENGTH) + "...";
    }

    // Strip newlines for chat
    text = text.replace(/[\r\n]+/g, " ").trim();

    // Cache result
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

  // Handle $(customapi.URL) and $(urlfetch.URL) first - URL can contain any chars
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
