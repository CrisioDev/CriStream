import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Daily Login Streaks
 *
 * Players earn escalating rewards for consecutive daily logins.
 * Checked automatically on first game play of each day.
 */

export interface LoginData {
  streak: number;
  lastLogin: string; // YYYY-MM-DD
  totalLogins: number;
  longestStreak: number;
}

interface LoginReward {
  points: number;
  bonus?: string;
}

function loginKey(channelId: string, userId: string): string {
  return `casino:login:${channelId}:${userId}`;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Calculate reward for a given streak day */
function getStreakReward(streak: number, streakCycles: number): LoginReward {
  const cycleBonus = streakCycles * 5;

  // Milestone rewards
  if (streak >= 100) return { points: 5000 + cycleBonus, bonus: "Legendärer Titel: 💯 Centurion" };
  if (streak >= 50) return { points: 1000 + cycleBonus };
  if (streak >= 30) return { points: 500 + cycleBonus, bonus: "Exklusives Item: 🌟 Mondsichel" };
  if (streak >= 14) return { points: 200 + cycleBonus, bonus: "Seltener Titel: 🔥 Streak-Master" };

  // Weekly cycle rewards (days 1-7)
  const dayInCycle = ((streak - 1) % 7) + 1;
  const dayRewards: Record<number, number> = {
    1: 10, 2: 15, 3: 25, 4: 35, 5: 50, 6: 75, 7: 100,
  };
  const points = (dayRewards[dayInCycle] ?? 10) + cycleBonus;

  if (dayInCycle === 7) {
    return { points, bonus: "1x Lootbox Token 🎁" };
  }

  return { points };
}

/** Check and update login streak. Called on first game play of the day. */
export async function checkLoginStreak(channelId: string, userId: string): Promise<{
  streak: number;
  reward: number;
  bonusReward?: string;
  isNewDay: boolean;
  totalLogins: number;
  longestStreak: number;
}> {
  const today = getToday();
  const yesterday = getYesterday();

  const raw = await redis.get(loginKey(channelId, userId));
  let data: LoginData = raw
    ? JSON.parse(raw)
    : { streak: 0, lastLogin: "", totalLogins: 0, longestStreak: 0 };

  // Already logged in today
  if (data.lastLogin === today) {
    return {
      streak: data.streak,
      reward: 0,
      isNewDay: false,
      totalLogins: data.totalLogins,
      longestStreak: data.longestStreak,
    };
  }

  // Calculate streak
  if (data.lastLogin === yesterday) {
    data.streak++;
  } else {
    data.streak = 1;
  }

  data.lastLogin = today;
  data.totalLogins++;
  if (data.streak > data.longestStreak) {
    data.longestStreak = data.streak;
  }

  // Calculate completed cycles (how many full 7-day streaks before this one)
  const streakCycles = Math.max(0, Math.floor((data.streak - 1) / 7));
  const reward = getStreakReward(data.streak, streakCycles);

  // Grant points
  if (reward.points > 0) {
    await prisma.channelUser.updateMany({
      where: { channelId, twitchUserId: userId },
      data: { points: { increment: reward.points } },
    });
  }

  await redis.set(loginKey(channelId, userId), JSON.stringify(data));

  return {
    streak: data.streak,
    reward: reward.points,
    bonusReward: reward.bonus,
    isNewDay: true,
    totalLogins: data.totalLogins,
    longestStreak: data.longestStreak,
  };
}

/** Get login data without modifying it */
export async function getLoginData(channelId: string, userId: string): Promise<LoginData | null> {
  const raw = await redis.get(loginKey(channelId, userId));
  if (!raw) return null;
  return JSON.parse(raw);
}
