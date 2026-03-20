import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import type {
  ChannelPointRewardDto,
  CreateChannelPointRewardDto,
  UpdateChannelPointRewardDto,
  RewardAction,
} from "@cristream/shared";

class ChannelPointService {
  async list(channelId: string): Promise<ChannelPointRewardDto[]> {
    const rewards = await prisma.channelPointReward.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
    });
    return rewards.map(this.toDto);
  }

  async create(
    channelId: string,
    data: CreateChannelPointRewardDto
  ): Promise<ChannelPointRewardDto> {
    const reward = await prisma.channelPointReward.create({
      data: {
        channelId,
        rewardTitle: data.rewardTitle,
        enabled: data.enabled ?? true,
        actionConfig: data.actionConfig as any,
        cost: data.cost ?? 100,
        prompt: data.prompt ?? "",
        isUserInputRequired: data.isUserInputRequired ?? false,
        maxPerStream: data.maxPerStream ?? null,
        maxPerUserPerStream: data.maxPerUserPerStream ?? null,
        globalCooldown: data.globalCooldown ?? null,
        backgroundColor: data.backgroundColor ?? "#9147FF",
      },
    });
    return this.toDto(reward);
  }

  async update(
    channelId: string,
    rewardId: string,
    data: UpdateChannelPointRewardDto
  ): Promise<ChannelPointRewardDto> {
    const updateData: any = {};
    if (data.rewardTitle !== undefined) updateData.rewardTitle = data.rewardTitle;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.actionConfig !== undefined) updateData.actionConfig = data.actionConfig as any;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.prompt !== undefined) updateData.prompt = data.prompt;
    if (data.isUserInputRequired !== undefined) updateData.isUserInputRequired = data.isUserInputRequired;
    if (data.maxPerStream !== undefined) updateData.maxPerStream = data.maxPerStream;
    if (data.maxPerUserPerStream !== undefined) updateData.maxPerUserPerStream = data.maxPerUserPerStream;
    if (data.globalCooldown !== undefined) updateData.globalCooldown = data.globalCooldown;
    if (data.backgroundColor !== undefined) updateData.backgroundColor = data.backgroundColor;

    const reward = await prisma.channelPointReward.update({
      where: { id: rewardId, channelId },
      data: updateData,
    });
    return this.toDto(reward);
  }

  async delete(channelId: string, rewardId: string): Promise<void> {
    await prisma.channelPointReward.delete({
      where: { id: rewardId, channelId },
    });
  }

  async findByReward(
    channelId: string,
    twitchRewardId: string,
    rewardTitle: string
  ): Promise<ChannelPointRewardDto | null> {
    if (twitchRewardId) {
      const byId = await prisma.channelPointReward.findFirst({
        where: { channelId, rewardId: twitchRewardId },
      });
      if (byId) return this.toDto(byId);
    }

    if (rewardTitle) {
      const byTitle = await prisma.channelPointReward.findUnique({
        where: { channelId_rewardTitle: { channelId, rewardTitle } },
      });
      if (byTitle) {
        if (twitchRewardId && !byTitle.rewardId) {
          await prisma.channelPointReward.update({
            where: { id: byTitle.id },
            data: { rewardId: twitchRewardId },
          });
          logger.info({ channelId, rewardTitle, twitchRewardId }, "Auto-captured Twitch rewardId");
        }
        return this.toDto(byTitle);
      }
    }

    return null;
  }

  async linkToTwitch(channelId: string, rewardId: string, twitchRewardId: string): Promise<ChannelPointRewardDto> {
    const reward = await prisma.channelPointReward.update({
      where: { id: rewardId, channelId },
      data: { rewardId: twitchRewardId },
    });
    return this.toDto(reward);
  }

  async unlinkFromTwitch(channelId: string, rewardId: string): Promise<ChannelPointRewardDto> {
    const reward = await prisma.channelPointReward.update({
      where: { id: rewardId, channelId },
      data: { rewardId: "" },
    });
    return this.toDto(reward);
  }

  private toDto(r: any): ChannelPointRewardDto {
    return {
      id: r.id,
      rewardId: r.rewardId,
      rewardTitle: r.rewardTitle,
      enabled: r.enabled,
      actionConfig: (r.actionConfig ?? []) as RewardAction[],
      cost: r.cost,
      prompt: r.prompt ?? "",
      isUserInputRequired: r.isUserInputRequired ?? false,
      maxPerStream: r.maxPerStream ?? null,
      maxPerUserPerStream: r.maxPerUserPerStream ?? null,
      globalCooldown: r.globalCooldown ?? null,
      backgroundColor: r.backgroundColor ?? "#9147FF",
      isSynced: !!r.rewardId,
      channelId: r.channelId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}

export const channelPointService = new ChannelPointService();
