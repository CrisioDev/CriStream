import { ApiClient } from "@twurple/api";
import { getAuthProvider } from "./twitch-auth.js";
import { logger } from "../lib/logger.js";
import type { TwitchRewardDto, CreateTwitchRewardDto, UpdateTwitchRewardDto } from "@cristream/shared";

let apiClient: ApiClient | null = null;

export function getTwitchApi(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient({ authProvider: getAuthProvider() });
  }
  return apiClient;
}

export async function sendWhisper(
  fromUserId: string,
  toUserId: string,
  message: string
): Promise<void> {
  try {
    const api = getTwitchApi();
    await api.whispers.sendWhisper(fromUserId, toUserId, message);
    logger.info({ fromUserId, toUserId }, "Whisper sent");
  } catch (err) {
    logger.error({ err, fromUserId, toUserId }, "Failed to send whisper");
  }
}

// ── Channel Point Rewards ──

export async function getTwitchRewards(broadcasterId: string): Promise<TwitchRewardDto[]> {
  const api = getTwitchApi();
  const rewards = await api.channelPoints.getCustomRewards(broadcasterId, false);
  return rewards.map(mapRewardToDto);
}

export async function createTwitchReward(
  broadcasterId: string,
  data: CreateTwitchRewardDto
): Promise<TwitchRewardDto> {
  const api = getTwitchApi();
  const reward = await api.channelPoints.createCustomReward(broadcasterId, {
    title: data.title,
    cost: data.cost,
    prompt: data.prompt ?? "",
    isEnabled: data.isEnabled ?? true,
    userInputRequired: data.isUserInputRequired ?? false,
    maxRedemptionsPerStream: data.maxPerStream ?? null,
    maxRedemptionsPerUserPerStream: data.maxPerUserPerStream ?? null,
    globalCooldown: data.globalCooldown ?? null,
    backgroundColor: data.backgroundColor ?? undefined,
  });
  return mapRewardToDto(reward);
}

export async function updateTwitchReward(
  broadcasterId: string,
  rewardId: string,
  data: UpdateTwitchRewardDto
): Promise<TwitchRewardDto> {
  const api = getTwitchApi();
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.cost !== undefined) updateData.cost = data.cost;
  if (data.prompt !== undefined) updateData.prompt = data.prompt;
  if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
  if (data.isPaused !== undefined) updateData.isPaused = data.isPaused;
  if (data.isUserInputRequired !== undefined) updateData.userInputRequired = data.isUserInputRequired;
  if (data.maxPerStream !== undefined) updateData.maxRedemptionsPerStream = data.maxPerStream;
  if (data.maxPerUserPerStream !== undefined) updateData.maxRedemptionsPerUserPerStream = data.maxPerUserPerStream;
  if (data.globalCooldown !== undefined) updateData.globalCooldown = data.globalCooldown;
  if (data.backgroundColor !== undefined) updateData.backgroundColor = data.backgroundColor;

  const reward = await api.channelPoints.updateCustomReward(broadcasterId, rewardId, updateData);
  return mapRewardToDto(reward);
}

export async function deleteTwitchReward(
  broadcasterId: string,
  rewardId: string
): Promise<void> {
  const api = getTwitchApi();
  await api.channelPoints.deleteCustomReward(broadcasterId, rewardId);
}

function mapRewardToDto(reward: any): TwitchRewardDto {
  return {
    id: reward.id,
    title: reward.title,
    cost: reward.cost,
    prompt: reward.prompt ?? "",
    isEnabled: reward.isEnabled,
    isPaused: reward.isPaused,
    isUserInputRequired: reward.userInputRequired ?? false,
    maxPerStream: reward.maxRedemptionsPerStream ?? null,
    maxPerUserPerStream: reward.maxRedemptionsPerUserPerStream ?? null,
    globalCooldown: reward.globalCooldown ?? null,
    backgroundColor: reward.backgroundColor ?? "",
    isManaged: reward.isManaged ?? false,
  };
}
