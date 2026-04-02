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

// ══════════════════════════════════════════════════════════════════════════
// Guild War (Weekly) — Quests, Boss, Weekly Ranking
// ══════════════════════════════════════════════════════════════════════════

function weeklyKey(channelId: string, guildId: string): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
  const weekStr = startOfWeek.toISOString().slice(0, 10);
  return `casino:guild:weekly:${channelId}:${guildId}:${weekStr}`;
}

function questsKey(channelId: string, guildId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `casino:guild:quests:${channelId}:${guildId}:${date}`;
}

function bossKey(channelId: string, guildId: string): string {
  return `casino:guild:boss:${channelId}:${guildId}`;
}

function secondsUntilSundayMidnight(): number {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday + 1));
  return Math.max(1, Math.floor((sunday.getTime() - now.getTime()) / 1000));
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

export interface GuildQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  done: boolean;
}

export interface GuildBoss {
  active: boolean;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  reward: number;
  defeated: boolean;
}

const QUEST_TEMPLATES = [
  { id: "guild_wins", title: "Gilden-Siege", desc: "Gewinnt zusammen {target} Spiele!", range: [20, 50] },
  { id: "guild_plays", title: "Gemeinsam spielen", desc: "Spielt zusammen {target} Runden!", range: [50, 150] },
  { id: "guild_points", title: "Punkte sammeln", desc: "Gewinnt zusammen {target} Punkte!", range: [1000, 5000] },
  { id: "guild_triples", title: "Triple-Power", desc: "Erzielt zusammen {target} Dreier!", range: [5, 15] },
  { id: "guild_streaks", title: "Glückssträhne", desc: "Erreicht zusammen {target} Gewinn-Streaks!", range: [3, 10] },
];

const BOSS_NAMES = [
  { name: "Der Goldene Golem", emoji: "🗿" },
  { name: "Schatten-Drache", emoji: "🐉" },
  { name: "Casino-Krake", emoji: "🐙" },
  { name: "Verfluchter Dealer", emoji: "🃏" },
  { name: "Diamant-Wächter", emoji: "💎" },
];

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Add weekly XP for a guild */
export async function addWeeklyXp(channelId: string, guildId: string, xp: number): Promise<number> {
  const key = weeklyKey(channelId, guildId);
  const result = await redis.incrby(key, xp);
  const ttl = await redis.ttl(key);
  if (ttl < 0) await redis.expire(key, secondsUntilSundayMidnight());
  return result;
}

/** Get weekly ranking of all guilds */
export async function getWeeklyRanking(channelId: string): Promise<any[]> {
  const guildIds = await redis.smembers(indexKey(channelId));
  const rankings: any[] = [];

  for (const guildId of guildIds) {
    const raw = await redis.get(guildKey(channelId, guildId));
    if (!raw) continue;
    const guild = JSON.parse(raw);
    const weeklyXp = parseInt(await redis.get(weeklyKey(channelId, guildId)) ?? "0");
    rankings.push({
      guildId,
      name: guild.name,
      emoji: guild.emoji,
      memberCount: guild.members.length,
      weeklyXp,
      totalXp: guild.totalXp,
    });
  }

  rankings.sort((a, b) => b.weeklyXp - a.weeklyXp);
  return rankings;
}

/** Get or generate daily guild quests (2 per day) */
export async function getGuildQuests(channelId: string, guildId: string): Promise<GuildQuest[]> {
  const key = questsKey(channelId, guildId);
  const raw = await redis.get(key);
  if (raw) return JSON.parse(raw);

  // Generate 2 random quests deterministically
  const date = new Date().toISOString().slice(0, 10);
  const seed = simpleHash(`${channelId}:${guildId}:${date}`);
  const idx1 = seed % QUEST_TEMPLATES.length;
  const idx2 = (seed + 3) % QUEST_TEMPLATES.length;
  const templates = [QUEST_TEMPLATES[idx1]!, QUEST_TEMPLATES[idx2 === idx1 ? (idx2 + 1) % QUEST_TEMPLATES.length : idx2]!];

  const quests: GuildQuest[] = templates.map((t, i) => {
    const target = t.range[0] + (simpleHash(`${channelId}:${guildId}:${date}:${i}`) % (t.range[1] - t.range[0] + 1));
    return {
      id: t.id,
      title: t.title,
      description: t.desc.replace("{target}", String(target)),
      target,
      progress: 0,
      done: false,
    };
  });

  const ttl = secondsUntilMidnight();
  await redis.set(key, JSON.stringify(quests), "EX", ttl);
  return quests;
}

/** Contribute to guild quests */
export async function contributeToGuildQuest(
  channelId: string, userId: string, questType: string, amount: number = 1,
): Promise<{ contributed: boolean; quests: GuildQuest[]; bossSpawned?: boolean }> {
  const guildId = await redis.get(memberKey(channelId, userId));
  if (!guildId) return { contributed: false, quests: [] };

  const quests = await getGuildQuests(channelId, guildId);
  let contributed = false;

  const typeMap: Record<string, string[]> = {
    win: ["guild_wins"], play: ["guild_plays"],
    points_won: ["guild_points"], triple: ["guild_triples"],
    streak: ["guild_streaks"],
  };

  const matchingIds = typeMap[questType] ?? [];
  for (const quest of quests) {
    if (matchingIds.includes(quest.id) && !quest.done) {
      quest.progress = Math.min(quest.progress + amount, quest.target);
      if (quest.progress >= quest.target) quest.done = true;
      contributed = true;
    }
  }

  if (contributed) {
    const key = questsKey(channelId, guildId);
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(quests), "EX", ttl > 0 ? ttl : secondsUntilMidnight());
  }

  // Check if both quests done → spawn boss
  let bossSpawned = false;
  if (quests.every(q => q.done)) {
    const existing = await redis.get(bossKey(channelId, guildId));
    if (!existing) {
      const guild = await getGuild(channelId, guildId);
      if (guild) {
        const bossTemplate = BOSS_NAMES[simpleHash(`${channelId}:${guildId}:boss`) % BOSS_NAMES.length]!;
        const boss: GuildBoss = {
          active: true,
          name: bossTemplate.name,
          emoji: bossTemplate.emoji,
          hp: 500 * guild.members.length,
          maxHp: 500 * guild.members.length,
          reward: 100,
          defeated: false,
        };
        await redis.set(bossKey(channelId, guildId), JSON.stringify(boss), "EX", secondsUntilMidnight());
        bossSpawned = true;
      }
    }
  }

  return { contributed, quests, bossSpawned };
}

/** Get guild boss status */
export async function getGuildBoss(channelId: string, userId: string): Promise<GuildBoss | null> {
  const guildId = await redis.get(memberKey(channelId, userId));
  if (!guildId) return null;
  const raw = await redis.get(bossKey(channelId, guildId));
  if (!raw) return null;
  return JSON.parse(raw);
}

/** Hit the guild boss (called on game win by guild member) */
export async function hitGuildBoss(
  channelId: string, userId: string, damage: number = 10,
): Promise<{ hit: boolean; boss: GuildBoss | null; defeated?: boolean }> {
  const guildId = await redis.get(memberKey(channelId, userId));
  if (!guildId) return { hit: false, boss: null };

  const raw = await redis.get(bossKey(channelId, guildId));
  if (!raw) return { hit: false, boss: null };

  const boss: GuildBoss = JSON.parse(raw);
  if (boss.defeated || !boss.active) return { hit: false, boss };

  boss.hp = Math.max(0, boss.hp - damage);

  if (boss.hp <= 0) {
    boss.defeated = true;
    boss.active = false;

    // Award all guild members
    const guild = await getGuild(channelId, guildId);
    if (guild) {
      for (const member of guild.members) {
        try {
          await prisma.channelUser.update({
            where: { channelId_twitchUserId: { channelId, twitchUserId: member.userId } },
            data: { points: { increment: boss.reward } },
          });
        } catch {}
      }
      // Bonus XP for the guild
      await addWeeklyXp(channelId, guildId, 200);
      await addGuildXp(channelId, userId, 200);
    }
  }

  const ttl = await redis.ttl(bossKey(channelId, guildId));
  await redis.set(bossKey(channelId, guildId), JSON.stringify(boss), "EX", ttl > 0 ? ttl : secondsUntilMidnight());

  return { hit: true, boss, defeated: boss.defeated };
}
