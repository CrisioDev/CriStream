import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Guilds / Clans
 *
 * Simple guild system. Players can create or join guilds.
 * Guild XP accumulates from all members' game activity.
 * Max 20 members per guild. Costs 1000 pts to create.
 */

export interface GuildMember {
  userId: string;
  displayName: string;
  joinedAt: number;
}

export interface GuildData {
  name: string;
  emoji: string;
  leaderId: string;
  leaderName: string;
  members: GuildMember[];
  createdAt: number;
  totalXp: number;
}

function guildKey(channelId: string, guildId: string): string {
  return `casino:guild:${channelId}:${guildId}`;
}

function memberKey(channelId: string, userId: string): string {
  return `casino:guild:member:${channelId}:${userId}`;
}

function indexKey(channelId: string): string {
  return `casino:guild:index:${channelId}`;
}

function generateGuildId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a new guild (costs 1000 points) */
export async function createGuild(
  channelId: string, userId: string, displayName: string, name: string, emoji: string,
): Promise<{ success: boolean; error?: string; guildId?: string }> {
  // Check not already in a guild
  const existing = await redis.get(memberKey(channelId, userId));
  if (existing) return { success: false, error: "Du bist bereits in einer Gilde!" };

  // Validate name
  if (!name || name.length < 2 || name.length > 20) {
    return { success: false, error: "Gildenname muss 2-20 Zeichen lang sein!" };
  }

  // Check points
  const channelUser = await prisma.channelUser.findUnique({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
  });
  if (!channelUser || channelUser.points < 1000) {
    return { success: false, error: "Nicht genug Punkte! Brauchst 1000." };
  }

  // Deduct cost
  await prisma.channelUser.update({
    where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
    data: { points: { decrement: 1000 } },
  });

  const guildId = generateGuildId();
  const guild: GuildData = {
    name,
    emoji: emoji || "⚔️",
    leaderId: userId,
    leaderName: displayName,
    members: [{ userId, displayName, joinedAt: Date.now() }],
    createdAt: Date.now(),
    totalXp: 0,
  };

  await redis.set(guildKey(channelId, guildId), JSON.stringify(guild));
  await redis.set(memberKey(channelId, userId), guildId);
  // Add to guild index for listing
  await redis.sadd(indexKey(channelId), guildId);

  return { success: true, guildId };
}

/** Join an existing guild */
export async function joinGuild(
  channelId: string, userId: string, displayName: string, guildId: string,
): Promise<{ success: boolean; error?: string }> {
  // Check not already in a guild
  const existing = await redis.get(memberKey(channelId, userId));
  if (existing) return { success: false, error: "Du bist bereits in einer Gilde!" };

  const raw = await redis.get(guildKey(channelId, guildId));
  if (!raw) return { success: false, error: "Gilde nicht gefunden!" };

  const guild: GuildData = JSON.parse(raw);
  if (guild.members.length >= 20) return { success: false, error: "Gilde ist voll! (Max 20 Mitglieder)" };

  guild.members.push({ userId, displayName, joinedAt: Date.now() });
  await redis.set(guildKey(channelId, guildId), JSON.stringify(guild));
  await redis.set(memberKey(channelId, userId), guildId);

  return { success: true };
}

/** Leave current guild */
export async function leaveGuild(channelId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const guildId = await redis.get(memberKey(channelId, userId));
  if (!guildId) return { success: false, error: "Du bist in keiner Gilde!" };

  const raw = await redis.get(guildKey(channelId, guildId));
  if (!raw) {
    await redis.del(memberKey(channelId, userId));
    return { success: true };
  }

  const guild: GuildData = JSON.parse(raw);
  guild.members = guild.members.filter(m => m.userId !== userId);

  if (guild.members.length === 0) {
    // Delete empty guild
    await redis.del(guildKey(channelId, guildId));
    await redis.srem(indexKey(channelId), guildId);
  } else {
    // Transfer leadership if leader leaves
    if (guild.leaderId === userId) {
      guild.leaderId = guild.members[0]!.userId;
      guild.leaderName = guild.members[0]!.displayName;
    }
    await redis.set(guildKey(channelId, guildId), JSON.stringify(guild));
  }

  await redis.del(memberKey(channelId, userId));
  return { success: true };
}

/** Get guild data by ID */
export async function getGuild(channelId: string, guildId: string): Promise<(GuildData & { guildId: string }) | null> {
  const raw = await redis.get(guildKey(channelId, guildId));
  if (!raw) return null;
  return { ...JSON.parse(raw), guildId };
}

/** Get the guild a player belongs to */
export async function getPlayerGuild(channelId: string, userId: string): Promise<(GuildData & { guildId: string }) | null> {
  const guildId = await redis.get(memberKey(channelId, userId));
  if (!guildId) return null;
  return getGuild(channelId, guildId);
}

/** Add XP to the player's guild */
export async function addGuildXp(channelId: string, userId: string, xp: number): Promise<void> {
  const guildId = await redis.get(memberKey(channelId, userId));
  if (!guildId) return;

  const raw = await redis.get(guildKey(channelId, guildId));
  if (!raw) return;

  const guild: GuildData = JSON.parse(raw);
  guild.totalXp += xp;
  await redis.set(guildKey(channelId, guildId), JSON.stringify(guild));
}

/** Get guild leaderboard (sorted by totalXp) */
export async function getGuildLeaderboard(channelId: string): Promise<any[]> {
  const guildIds = await redis.smembers(indexKey(channelId));
  const guilds: any[] = [];

  for (const guildId of guildIds) {
    const raw = await redis.get(guildKey(channelId, guildId));
    if (!raw) continue;
    const data = JSON.parse(raw);
    guilds.push({
      guildId,
      name: data.name,
      emoji: data.emoji,
      leaderName: data.leaderName,
      memberCount: data.members.length,
      totalXp: data.totalXp,
    });
  }

  guilds.sort((a, b) => b.totalXp - a.totalXp);
  return guilds;
}

/** List all guilds in a channel */
export async function listGuilds(channelId: string): Promise<any[]> {
  return getGuildLeaderboard(channelId);
}
