import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

// ── Generic get/set with Redis cache + DB persistence ──

async function getJson(redisKey: string, channelId: string, userId: string, field: string): Promise<any> {
  // Try Redis first (fast path)
  const cached = await redis.get(redisKey);
  if (cached) return JSON.parse(cached);

  // Fallback to DB
  const profile = await prisma.casinoProfile.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (profile && (profile as any)[field]) {
    const data = (profile as any)[field];
    // Re-populate Redis cache
    await redis.set(redisKey, JSON.stringify(data));
    return data;
  }
  return null;
}

async function setJson(redisKey: string, channelId: string, userId: string, field: string, data: any): Promise<void> {
  const json = JSON.stringify(data);
  // Write to Redis (immediate)
  await redis.set(redisKey, json);
  // Write to DB (persistent) — upsert
  await prisma.casinoProfile.upsert({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    create: { channelId, twitchUserId: userId, [field]: data },
    update: { [field]: data },
  }).catch(() => {}); // non-critical — Redis is primary for speed
}

// ── Specific accessors ──

export async function getPetData(channelId: string, userId: string): Promise<any> {
  return getJson(`casino:pet:${channelId}:${userId}`, channelId, userId, "petData");
}
export async function setPetData(channelId: string, userId: string, data: any): Promise<void> {
  return setJson(`casino:pet:${channelId}:${userId}`, channelId, userId, "petData", data);
}

export async function getSkillData(channelId: string, userId: string): Promise<any> {
  return getJson(`casino:skills:${channelId}:${userId}`, channelId, userId, "skillData");
}
export async function setSkillData(channelId: string, userId: string, data: any): Promise<void> {
  return setJson(`casino:skills:${channelId}:${userId}`, channelId, userId, "skillData", data);
}

export async function getStatsData(channelId: string, userId: string): Promise<any> {
  return getJson(`casino:stats:${channelId}:${userId}`, channelId, userId, "statsData");
}
export async function setStatsData(channelId: string, userId: string, data: any): Promise<void> {
  return setJson(`casino:stats:${channelId}:${userId}`, channelId, userId, "statsData", data);
}

export async function getBreedData(channelId: string, userId: string): Promise<any> {
  const key = `casino:breed:${channelId}:${userId}`;
  return getJson(key, channelId, userId, "breedData");
}
export async function setBreedData(channelId: string, userId: string, data: any): Promise<void> {
  const key = `casino:breed:${channelId}:${userId}`;
  return setJson(key, channelId, userId, "breedData", data);
}

export async function getPrestige(channelId: string, userId: string): Promise<number> {
  const cached = await redis.get(`casino:prestige:${channelId}:${userId}`);
  if (cached) return parseInt(cached);
  const profile = await prisma.casinoProfile.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  const val = profile?.prestige ?? 0;
  if (val > 0) await redis.set(`casino:prestige:${channelId}:${userId}`, String(val));
  return val;
}
export async function setPrestige(channelId: string, userId: string, level: number): Promise<void> {
  await redis.set(`casino:prestige:${channelId}:${userId}`, String(level));
  await prisma.casinoProfile.upsert({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    create: { channelId, twitchUserId: userId, prestige: level },
    update: { prestige: level },
  }).catch(() => {});
}

export async function getAutoflipData(channelId: string, userId: string): Promise<any> {
  // Combine state + stats
  const stateRaw = await redis.get(`casino:autoflip:${channelId}:${userId}`);
  const statsRaw = await redis.get(`casino:autoflip:stats:${channelId}:${userId}`);
  if (stateRaw || statsRaw) {
    return { state: stateRaw ? JSON.parse(stateRaw) : null, stats: statsRaw ? JSON.parse(statsRaw) : null };
  }
  const profile = await prisma.casinoProfile.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  return (profile as any)?.autoflipData ?? null;
}
export async function setAutoflipData(channelId: string, userId: string, data: any): Promise<void> {
  if (data?.state) await redis.set(`casino:autoflip:${channelId}:${userId}`, JSON.stringify(data.state));
  if (data?.stats) await redis.set(`casino:autoflip:stats:${channelId}:${userId}`, JSON.stringify(data.stats));
  await prisma.casinoProfile.upsert({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    create: { channelId, twitchUserId: userId, autoflipData: data },
    update: { autoflipData: data },
  }).catch(() => {});
}

/**
 * Periodic sync: flush all Redis casino data to DB.
 * Call this on a schedule (e.g., every 5 minutes) to ensure DB is up to date.
 */
export async function syncAllToDb(): Promise<number> {
  let synced = 0;
  const petKeys = await redis.keys("casino:pet:*");
  for (const key of petKeys) {
    const parts = key.split(":");
    if (parts.length < 4) continue;
    const channelId = parts[2]!;
    const userId = parts[3]!;
    try {
      const petRaw = await redis.get(key);
      const skillRaw = await redis.get(`casino:skills:${channelId}:${userId}`);
      const statsRaw = await redis.get(`casino:stats:${channelId}:${userId}`);
      const breedRaw = await redis.get(`casino:breed:${channelId}:${userId}`);
      const prestigeRaw = await redis.get(`casino:prestige:${channelId}:${userId}`);
      const afStateRaw = await redis.get(`casino:autoflip:${channelId}:${userId}`);
      const afStatsRaw = await redis.get(`casino:autoflip:stats:${channelId}:${userId}`);

      const updateData: any = {};
      if (petRaw) updateData.petData = JSON.parse(petRaw);
      if (skillRaw) updateData.skillData = JSON.parse(skillRaw);
      if (statsRaw) updateData.statsData = JSON.parse(statsRaw);
      if (breedRaw) updateData.breedData = JSON.parse(breedRaw);
      if (prestigeRaw) updateData.prestige = parseInt(prestigeRaw);
      if (afStateRaw || afStatsRaw) {
        updateData.autoflipData = {
          state: afStateRaw ? JSON.parse(afStateRaw) : null,
          stats: afStatsRaw ? JSON.parse(afStatsRaw) : null,
        };
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.casinoProfile.upsert({
          where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
          create: { channelId, twitchUserId: userId, ...updateData },
          update: updateData,
        });
        synced++;
      }
    } catch { /* skip individual user errors */ }
  }
  return synced;
}
