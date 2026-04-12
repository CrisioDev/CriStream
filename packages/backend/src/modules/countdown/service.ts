import { redis } from "../../lib/redis.js";
import { randomUUID } from "crypto";

/**
 * Countdown Timer Service
 *
 * Each timer has its own overlay URL. Two modes:
 * - "duration": fixed value (e.g. 5 min), restarts on every page load
 * - "target": counts down to a specific date/time
 */

export interface CountdownTimer {
  id: string;
  name: string;
  mode: "duration" | "target";
  durationSeconds: number | null;   // for "duration" mode
  targetDate: string | null;        // ISO string for "target" mode
  style: CountdownStyle;
  createdAt: number;
}

export interface CountdownStyle {
  fontFamily: string;
  fontSize: number;         // px
  color: string;            // hex
  backgroundColor: string;  // hex or "transparent"
  showLabels: boolean;      // show d/h/m/s labels
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  separator: string;        // e.g. ":"
  completedText: string;    // shown when timer hits 0
}

const DEFAULT_STYLE: CountdownStyle = {
  fontFamily: "'Segoe UI', sans-serif",
  fontSize: 72,
  color: "#ffffff",
  backgroundColor: "transparent",
  showLabels: true,
  showDays: true,
  showHours: true,
  showMinutes: true,
  showSeconds: true,
  separator: ":",
  completedText: "TIME'S UP!",
};

function timersKey(channelId: string): string {
  return `countdown:timers:${channelId}`;
}

export async function listTimers(channelId: string): Promise<CountdownTimer[]> {
  const raw = await redis.hgetall(timersKey(channelId));
  const timers: CountdownTimer[] = [];
  for (const [, val] of Object.entries(raw)) {
    try { timers.push(JSON.parse(val)); } catch {}
  }
  timers.sort((a, b) => b.createdAt - a.createdAt);
  return timers;
}

export async function getTimer(channelId: string, timerId: string): Promise<CountdownTimer | null> {
  const raw = await redis.hget(timersKey(channelId), timerId);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function createTimer(
  channelId: string,
  data: { name: string; mode: "duration" | "target"; durationSeconds?: number; targetDate?: string; style?: Partial<CountdownStyle> },
): Promise<CountdownTimer> {
  const id = randomUUID().slice(0, 8);
  const timer: CountdownTimer = {
    id,
    name: data.name || "Timer",
    mode: data.mode,
    durationSeconds: data.mode === "duration" ? (data.durationSeconds ?? 300) : null,
    targetDate: data.mode === "target" ? (data.targetDate ?? null) : null,
    style: { ...DEFAULT_STYLE, ...data.style },
    createdAt: Date.now(),
  };
  await redis.hset(timersKey(channelId), id, JSON.stringify(timer));
  return timer;
}

export async function updateTimer(
  channelId: string,
  timerId: string,
  updates: Partial<{ name: string; mode: "duration" | "target"; durationSeconds: number; targetDate: string; style: Partial<CountdownStyle> }>,
): Promise<CountdownTimer | null> {
  const existing = await getTimer(channelId, timerId);
  if (!existing) return null;

  if (updates.name !== undefined) existing.name = updates.name;
  if (updates.mode !== undefined) existing.mode = updates.mode;
  if (updates.durationSeconds !== undefined) existing.durationSeconds = updates.durationSeconds;
  if (updates.targetDate !== undefined) existing.targetDate = updates.targetDate;
  if (updates.style) existing.style = { ...existing.style, ...updates.style };

  await redis.hset(timersKey(channelId), timerId, JSON.stringify(existing));
  return existing;
}

export async function deleteTimer(channelId: string, timerId: string): Promise<boolean> {
  const removed = await redis.hdel(timersKey(channelId), timerId);
  return removed > 0;
}
