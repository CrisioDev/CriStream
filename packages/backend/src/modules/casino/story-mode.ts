// Story Mode — placeholder, full implementation coming next
import { redis } from "../../lib/redis.js";

export async function getStoryState(channelId: string, userId: string): Promise<any> {
  const raw = await redis.get(`casino:story:${channelId}:${userId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function startStory(channelId: string, userId: string): Promise<any> {
  const state = { chapter: 1, scene: 1, points: 0, inventory: [], choices: {}, stats: { wins: 0, losses: 0, puzzlesSolved: 0, bossesDefeated: 0 }, startedAt: Date.now(), lastPlayed: Date.now() };
  await redis.set(`casino:story:${channelId}:${userId}`, JSON.stringify(state));
  return { state, scene: { text: "Story Mode kommt bald! Die Legende des Goldenen Chips — 40 Kapitel voller Abenteuer.", character: "🦊 Rico" } };
}

export async function advanceStory(channelId: string, userId: string): Promise<any> {
  return { state: await getStoryState(channelId, userId), scene: { text: "Nächste Szene kommt bald..." } };
}

export async function makeChoice(channelId: string, userId: string, choiceId: string): Promise<any> {
  return { state: await getStoryState(channelId, userId), scene: { text: "Deine Wahl wurde gespeichert." } };
}

export async function reportGameResult(channelId: string, userId: string, won: boolean): Promise<any> {
  return { state: await getStoryState(channelId, userId), scene: { text: won ? "Gewonnen! Weiter geht's." : "Verloren! Versuch es nochmal." } };
}
