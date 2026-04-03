import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";

const JACKPOT_KEY = (channelId: string) => `casino:jackpot:${channelId}`;
const LAST_WINNER_KEY = (channelId: string) => `casino:jackpot:last:${channelId}`;

const BASE_WIN_CHANCE = 0.001; // 0.1% (1 in 1000)
const HIGH_WIN_CHANCE = 0.005; // 0.5% when jackpot > 10000
const HIGH_THRESHOLD = 10000;
const CONTRIBUTION_RATE = 0.02; // 2% of game cost
const INITIAL_JACKPOT = 100;

export async function getJackpot(
  channelId: string
): Promise<{
  amount: number;
  lastWinner: { displayName: string; amount: number; time: number } | null;
}> {
  const [amountStr, lastWinnerStr] = await Promise.all([
    redis.get(JACKPOT_KEY(channelId)),
    redis.get(LAST_WINNER_KEY(channelId)),
  ]);

  const amount = amountStr ? parseInt(amountStr, 10) : INITIAL_JACKPOT;
  const lastWinner = lastWinnerStr ? JSON.parse(lastWinnerStr) : null;

  return { amount, lastWinner };
}

export async function contributeToJackpot(
  channelId: string,
  userId: string,
  displayName: string,
  gameCost: number
): Promise<{ won: boolean; amount?: number }> {
  // Contribute 2% of game cost, minimum 1
  const contribution = Math.max(1, Math.floor(gameCost * CONTRIBUTION_RATE));

  // Increment jackpot
  const currentAmount = await redis.incrby(JACKPOT_KEY(channelId), contribution);

  // Determine win chance
  const winChance = currentAmount > HIGH_THRESHOLD ? HIGH_WIN_CHANCE : BASE_WIN_CHANCE;

  // Roll for jackpot
  const roll = Math.random();
  if (roll < winChance) {
    // Winner! Award the full jackpot
    const wonAmount = currentAmount;

    // Credit points to the user
    await prisma.channelUser.update({
      where: { channelId_twitchUserId: { channelId, twitchUserId: userId } },
      data: { points: { increment: wonAmount } },
    });

    // Save last winner info
    const winnerInfo = { displayName, amount: wonAmount, time: Date.now() };
    await Promise.all([
      redis.set(JACKPOT_KEY(channelId), INITIAL_JACKPOT.toString()),
      redis.set(LAST_WINNER_KEY(channelId), JSON.stringify(winnerInfo)),
    ]);

    return { won: true, amount: wonAmount };
  }

  return { won: false };
}
