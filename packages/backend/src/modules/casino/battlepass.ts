import { prisma } from "../../lib/prisma.js";

const DEFAULT_REWARDS = [
  { level: 5, type: "title", value: "Casino-Neuling", premium: false },
  { level: 10, type: "points", value: 100, premium: false },
  { level: 15, type: "lootbox", value: 1, premium: false },
  { level: 20, type: "points", value: 200, premium: false },
  { level: 25, type: "title", value: "Casino-Kenner", premium: false },
  { level: 30, type: "points", value: 300, premium: false },
  { level: 35, type: "lootbox", value: 2, premium: false },
  { level: 40, type: "points", value: 500, premium: false },
  { level: 45, type: "title", value: "Casino-Meister", premium: false },
  { level: 50, type: "points", value: 1000, premium: false },
  { level: 50, type: "title", value: "Casino-Legende S1", premium: false },
  { level: 50, type: "autoflip", value: "Auto-Münzwurf Bot", premium: false },
  // Premium-only rewards
  { level: 3, type: "points", value: 50, premium: true },
  { level: 8, type: "title", value: "Premium-Spieler", premium: true },
  { level: 13, type: "points", value: 100, premium: true },
  { level: 18, type: "lootbox", value: 1, premium: true },
  { level: 23, type: "points", value: 150, premium: true },
  { level: 28, type: "title", value: "VIP Gambler", premium: true },
  { level: 33, type: "points", value: 250, premium: true },
  { level: 38, type: "lootbox", value: 2, premium: true },
  { level: 43, type: "points", value: 400, premium: true },
  { level: 48, type: "title", value: "Premium-Legende", premium: true },
];

function xpForLevel(level: number): number {
  return level * 100;
}

export async function getOrCreateSeason(channelId: string) {
  // Find active season
  let season = await prisma.season.findFirst({
    where: { channelId, active: true },
  });

  if (season) {
    // Check if expired
    if (new Date() > season.endDate) {
      await prisma.season.update({
        where: { id: season.id },
        data: { active: false },
      });
      season = null;
    }
  }

  if (!season) {
    // Get next season number
    const lastSeason = await prisma.season.findFirst({
      where: { channelId },
      orderBy: { number: "desc" },
    });
    const nextNumber = (lastSeason?.number ?? 0) + 1;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    season = await prisma.season.create({
      data: {
        channelId,
        name: `Saison ${nextNumber}: ${nextNumber === 1 ? "Goldfieber" : nextNumber === 2 ? "Diamantenrausch" : nextNumber === 3 ? "Sternenstaub" : "Neue Ära"}`,
        number: nextNumber,
        startDate,
        endDate,
        active: true,
        rewards: DEFAULT_REWARDS as any,
      },
    });
  }

  return season;
}

export async function getSeasonProgress(channelId: string, userId: string) {
  const season = await getOrCreateSeason(channelId);

  let progress = await prisma.seasonProgress.findUnique({
    where: {
      channelId_twitchUserId_seasonId: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
      },
    },
  });

  if (!progress) {
    progress = await prisma.seasonProgress.create({
      data: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
        xp: 0,
        level: 0,
        premium: false,
        claimedLevels: [],
      },
    });
  }

  const nextLevelXp = xpForLevel(progress.level + 1);
  const currentLevelXp = progress.level > 0
    ? Array.from({ length: progress.level }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0)
    : 0;
  const xpIntoCurrentLevel = progress.xp - currentLevelXp;

  return {
    season: {
      id: season.id,
      name: season.name,
      number: season.number,
      startDate: season.startDate,
      endDate: season.endDate,
      rewards: season.rewards,
    },
    progress: {
      xp: progress.xp,
      level: progress.level,
      premium: progress.premium,
      claimedLevels: progress.claimedLevels,
      xpIntoCurrentLevel,
    },
    nextLevelXp,
  };
}

export async function addXp(
  channelId: string,
  userId: string,
  amount: number,
  _source: string,
): Promise<{ levelUp: boolean; newLevel: number; rewards: any[] }> {
  const season = await getOrCreateSeason(channelId);

  let progress = await prisma.seasonProgress.findUnique({
    where: {
      channelId_twitchUserId_seasonId: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
      },
    },
  });

  if (!progress) {
    progress = await prisma.seasonProgress.create({
      data: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
        xp: 0,
        level: 0,
        premium: false,
        claimedLevels: [],
      },
    });
  }

  const newXp = progress.xp + amount;
  let newLevel = progress.level;
  let totalXpNeeded = Array.from({ length: newLevel + 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0);

  // Check level ups
  while (newXp >= totalXpNeeded && newLevel < 50) {
    newLevel++;
    totalXpNeeded += xpForLevel(newLevel + 1);
  }

  const levelUp = newLevel > progress.level;

  await prisma.seasonProgress.update({
    where: { id: progress.id },
    data: { xp: newXp, level: newLevel },
  });

  // Collect rewards for levels that were passed
  const rewards: any[] = [];
  if (levelUp) {
    const rewardsArr = (season.rewards as any[]) ?? [];
    for (let l = progress.level + 1; l <= newLevel; l++) {
      const levelRewards = rewardsArr.filter(
        (r: any) => r.level === l && (!r.premium || progress!.premium),
      );
      rewards.push(...levelRewards);
    }
  }

  return { levelUp, newLevel, rewards };
}

export async function buyPremium(
  channelId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const season = await getOrCreateSeason(channelId);
  const PREMIUM_COST = 500;

  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });

  if (!channelUser || channelUser.points < PREMIUM_COST) {
    return { success: false, error: `Nicht genug Punkte! Brauchst ${PREMIUM_COST}.` };
  }

  const progress = await prisma.seasonProgress.findUnique({
    where: {
      channelId_twitchUserId_seasonId: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
      },
    },
  });

  if (progress?.premium) {
    return { success: false, error: "Du hast bereits Premium für diese Saison!" };
  }

  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: PREMIUM_COST } },
  });

  if (progress) {
    await prisma.seasonProgress.update({
      where: { id: progress.id },
      data: { premium: true },
    });
  } else {
    await prisma.seasonProgress.create({
      data: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
        xp: 0,
        level: 0,
        premium: true,
        claimedLevels: [],
      },
    });
  }

  return { success: true };
}

export async function claimReward(
  channelId: string,
  userId: string,
  level: number,
): Promise<{ success: boolean; reward?: any; error?: string }> {
  const season = await getOrCreateSeason(channelId);

  const progress = await prisma.seasonProgress.findUnique({
    where: {
      channelId_twitchUserId_seasonId: {
        channelId,
        twitchUserId: userId,
        seasonId: season.id,
      },
    },
  });

  if (!progress) return { success: false, error: "Kein Fortschritt gefunden." };
  if (progress.level < level) return { success: false, error: "Level noch nicht erreicht!" };
  if (progress.claimedLevels.includes(level)) return { success: false, error: "Bereits abgeholt!" };

  const rewardsArr = (season.rewards as any[]) ?? [];
  const levelRewards = rewardsArr.filter(
    (r: any) => r.level === level && (!r.premium || progress.premium),
  );

  if (levelRewards.length === 0) return { success: false, error: "Keine Belohnung auf diesem Level." };

  // Apply rewards — multiply points by 10^prestige per pass cycle
  const { redis } = await import("../../lib/redis.js");
  const prestigeRaw = await redis.get(`casino:prestige:${channelId}:${userId}`);
  const prestigeLevel = prestigeRaw ? parseInt(prestigeRaw) : 0;
  const seasonMultiplier = Math.pow(10, prestigeLevel); // x1, x10, x100, x1000...

  for (const r of levelRewards) {
    if (r.type === "points" && typeof r.value === "number") {
      const scaledReward = Math.round(r.value * seasonMultiplier);
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
        data: { points: { increment: scaledReward } },
      });
    } else if (r.type === "title" && typeof r.value === "string") {
      await prisma.activeTitle.upsert({
        where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
        create: { channelId, twitchUserId: userId, title: r.value },
        update: { title: r.value },
      });
    }
    // lootbox: would need lootbox service integration, for now give points equivalent
    else if (r.type === "lootbox" && typeof r.value === "number") {
      const scaledLootbox = Math.round(r.value * 50 * seasonMultiplier);
      await prisma.channelUser.update({
        where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
        data: { points: { increment: scaledLootbox } },
      });
    }
  }

  // Mark level as claimed
  await prisma.seasonProgress.update({
    where: { id: progress.id },
    data: { claimedLevels: [...progress.claimedLevels, level] },
  });

  return { success: true, reward: levelRewards };
}

export async function getSeasonLeaderboard(
  channelId: string,
): Promise<{ displayName: string; xp: number; level: number }[]> {
  const season = await getOrCreateSeason(channelId);

  const progress = await prisma.seasonProgress.findMany({
    where: { seasonId: season.id },
    orderBy: { xp: "desc" },
    take: 15,
  });

  // Fetch display names
  const userIds = progress.map((p) => p.twitchUserId);
  const channelUsers = await prisma.channelUser.findMany({
    where: { channelId, twitchUserId: { in: userIds } },
    select: { twitchUserId: true, displayName: true },
  });
  const nameMap = new Map(channelUsers.map((u) => [u.twitchUserId, u.displayName]));

  // Fetch prestige levels
  const { redis } = await import("../../lib/redis.js");
  const prestigeMap = new Map<string, number>();
  for (const uid of userIds) {
    const pRaw = await redis.get(`casino:prestige:${channelId}:${uid}`);
    if (pRaw) prestigeMap.set(uid, parseInt(pRaw));
  }

  return progress.map((p) => ({
    displayName: nameMap.get(p.twitchUserId) ?? "Unbekannt",
    xp: p.xp,
    level: p.level,
    prestige: prestigeMap.get(p.twitchUserId) ?? 0,
  }));
}
